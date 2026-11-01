// Store del Skill Evaluation Engine: registro, benchmarks, cola de runs y
// runner real contra OpenCode. Aislamiento: sesión en el workspace (las skills
// solo resuelven ahí), prompt que confina TODA escritura al tmpdir absoluto,
// denegación automática de permisos fuera del tmpdir, verificación pre/post de
// que ninguna skill original cambió. Sin auto-aprobaciones.
import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getWorkspaceDir } from '../components/panels';
import { useSessions } from './sessions';
import type {
  Benchmark, Dashboard, EvalSkill, Finding, RunDetail, RunSummary, SkillDetail, GroupPair,
} from '../lib/eval/types';
import { autoVerdict, computeScore, type AutoCheckOutcome, type DimId } from '../lib/eval/scoring';

interface EvalState {
  ready: boolean;
  skills: EvalSkill[];
  benchmarks: Benchmark[];
  groups: GroupPair[];
  dashboard: Dashboard | null;
  runs: RunSummary[];
  detail: RunDetail | null;
  skillDetail: SkillDetail | null;
  // Filtros UI (persistidos en memoria de sesión).
  q: string;
  grp: string;
  origin: string;
  status: string;
  // Runner.
  queue: string[];
  activeRunId: string | null;
  concurrency: number;
  timeoutMs: number;
  semanticJudge: boolean;
  cleanupTmp: boolean;
  cancelReq: Record<string, boolean>;
  busy: boolean;
  error: string | null;
  lastEvent: string | null;

  setFilter: (p: Partial<Pick<EvalState, 'q' | 'grp' | 'origin' | 'status'>>) => void;
  setRunnerOpts: (p: Partial<Pick<EvalState, 'concurrency' | 'timeoutMs' | 'semanticJudge' | 'cleanupTmp'>>) => void;
  refreshAll: () => Promise<void>;
  scan: () => Promise<void>;
  analyze: (skillId?: string) => Promise<{ analyzed: number; critical: number }>;
  openSkill: (id: string) => Promise<void>;
  openRun: (id: string) => Promise<void>;
  queueBenchmark: (benchmarkId: string, skillIds: string[]) => Promise<string>;
  cancelRun: (runId: string) => Promise<void>;
  cleanupRunTmp: (runId: string) => Promise<void>;
  compareRuns: (a: string, b: string) => Promise<unknown>;
  history: (skillId: string) => Promise<unknown>;
  exportReport: (kind: string, format: string) => Promise<{ filename: string; content: string }>;
}

function shortId(prefix: string): string {
  const t = Date.now().toString(36);
  const r = Math.floor(Math.random() * 0xffffff).toString(36).padStart(4, '0');
  return `${prefix}-${t}-${r}`;
}

function extractText(m: { text?: string; content?: Array<{ type: string; text?: string }>; parts?: Array<{ type: string; text?: string }> }): string {
  if (typeof m.text === 'string' && m.text) return m.text;
  const blocks = (Array.isArray(m.content) ? m.content : Array.isArray(m.parts) ? m.parts : []) as Array<{ type: string; text?: string }>;
  return blocks.filter((b) => typeof b.text === 'string').map((b) => b.text as string).join('\n');
}

/** Heurística de parseabilidad Luau (balance de bloques/paréntesis). NO sustituye a selene; se etiqueta como tal. */
export function luaBalanceHeuristic(src: string): { ok: boolean; detail: string } {
  const lines = src.split('\n').map((l) => {
    // Corte ingenuo de comentarios -- (puede fallar dentro de strings: heurística).
    const i = l.indexOf('--');
    return i >= 0 ? l.slice(0, i) : l;
  });
  const code = lines.join('\n');
  const words = code.match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? [];
  const opens = words.filter((w) => w === 'function' || w === 'do' || w === 'then').length;
  const repeats = (code.match(/\brepeat\b/g) ?? []).length;
  const ends = words.filter((w) => w === 'end').length;
  const untils = (code.match(/\buntil\b/g) ?? []).length;
  const pairs: Array<[string, string]> = [['(', ')'], ['{', '}'], ['[', ']']];
  const stripped = code.replace(/"([^"\\]|\\.)*"/g, '""').replace(/'([^'\\]|\\.)*'/g, "''");
  for (const [a, b] of pairs) {
    let depth = 0;
    for (const ch of stripped) {
      if (ch === a) depth++;
      if (ch === b) depth--;
      if (depth < 0) return { ok: false, detail: `desbalance de ${a}${b}` };
    }
    if (depth !== 0) return { ok: false, detail: `desbalance de ${a}${b}` };
  }
  if (ends < opens) return { ok: false, detail: `faltan ${opens - ends} end` };
  if (untils < repeats) return { ok: false, detail: 'repeat sin until' };
  return { ok: true, detail: 'balance correcto (heurística)' };
}

async function readTmp(tmp: string, rel: string): Promise<string | null> {
  try {
    return await invoke<string>('eval_read_tmpfile', { tmp, rel });
  } catch {
    return null;
  }
}

export const useEval = create<EvalState>((set, get) => {
  let eventsOff: Array<() => void> = [];
  let pumping = false;

  async function refreshRuns() {
    try {
      const runs = await invoke<RunSummary[]>('eval_list_runs', { limit: 100 });
      set({ runs });
    } catch { /* best-effort */ }
  }

  async function refreshDashboard() {
    try {
      const dashboard = await invoke<Dashboard>('eval_dashboard', {});
      set({ dashboard });
    } catch { /* best-effort */ }
  }

  async function pump() {
    if (pumping) return;
    pumping = true;
    try {
      for (;;) {
        const { queue, activeRunId, concurrency } = get();
        const actives = activeRunId ? 1 : 0;
        if (actives >= Math.min(2, Math.max(1, concurrency)) || queue.length === 0) break;
        const next = queue[0];
        set({ queue: queue.slice(1), activeRunId: next });
        await runBenchmark(next).catch(() => {});
        set({ activeRunId: null });
      }
    } finally {
      pumping = false;
    }
  }

  async function runBenchmark(runId: string): Promise<void> {
    const t0 = Date.now();
    const ws = await getWorkspaceDir().catch(() => '');
    if (!ws) {
      await invoke('eval_update_run', { id: runId, patch: { status: 'fallida', error: 'Sin workspace configurado' } }).catch(() => {});
      return;
    }
    const client = useSessions.getState().client;
    if (!client) {
      await invoke('eval_update_run', { id: runId, patch: { status: 'fallida', error: 'Servidor OpenCode no conectado: conéctalo en Inicio' } }).catch(() => {});
      return;
    }
    let run: RunDetail;
    try {
      run = await invoke<RunDetail>('eval_get_run', { id: runId });
    } catch (e) {
      set({ error: String(e) });
      return;
    }
    const bench = get().benchmarks.find((b) => b.id === run.benchmark_id)
      ?? await invoke<Benchmark>('eval_get_benchmark', { id: run.benchmark_id }).catch(() => null as unknown as Benchmark);
    if (!bench) {
      await invoke('eval_update_run', { id: runId, patch: { status: 'fallida', error: 'Benchmark inexistente' } }).catch(() => {});
      return;
    }
    // Análisis estático previo de las skills implicadas (si falta).
    let criticalCount = 0;
    const skillContents: Array<{ id: string; excerpt: string }> = [];
    try {
      const skills: EvalSkill[] = await invoke('eval_list_skills', { query: null, grp: null, origin: null, status: null });
      const involved = skills.filter((s) => run.skill_ids.includes(s.id));
      const preHashes = new Map(involved.map((s) => [s.id, s.hash]));
      (run as RunDetail & { preHashes?: Map<string, string> }).preHashes = preHashes;
      for (const s of involved) {
        let findings: Finding[] = [];
        try {
          findings = s.analysis ? (JSON.parse(s.analysis) as Finding[]) : [];
        } catch { findings = []; }
        if (!s.analysis) {
          await invoke('eval_analyze', { workspaceDir: ws, skillId: s.id }).catch(() => null);
          const det = await invoke<SkillDetail>('eval_get_skill', { id: s.id }).catch(() => null);
          findings = det?.findings ?? [];
        }
        criticalCount += findings.filter((f) => f.severity === 'CRITICAL').length;
        // Extracto de la skill para el prompt (original intacto: solo lectura).
        try {
          const raw = await invoke<string>('fs_read', { projectDir: ws, rel: s.path });
          skillContents.push({ id: s.id, excerpt: raw.slice(0, 6000) });
        } catch { /* sin extracto */ }
      }
    } catch { /* análisis best-effort */ }

    let tmp = '';
    let sessionId = '';
    try {
      tmp = await invoke<string>('eval_create_tmpdir', { label: run.benchmark_id.slice(0, 18) });
      await invoke('eval_update_run', { id: runId, patch: { status: 'activa', tmpDir: tmp } }).catch(() => {});
      // Sesión en el WORKSPACE (las skills solo resuelven ahí).
      const validSkills = run.skill_ids.filter((id) => get().skills.some((s) => s.id === id));
      const sess = await client.createSession({ title: `EVAL ${run.benchmark_id} ${runId.slice(-6)}`, directory: ws });
      sessionId = sess.id;
      await invoke('eval_update_run', { id: runId, patch: { sessionId } }).catch(() => {});

      const skillBlock = skillContents.map((s) => `--- SKILL ${s.id} (extracto, solo lectura) ---\n${s.excerpt}`).join('\n\n').slice(0, 24000);
      const prompt = [
        `Eres un benchmark AUTOMÁTICO del Skill Evaluation Engine. No converses: genera archivos.`,
        ``,
        `BENCHMARK: ${bench.name} — ${bench.objective}`,
        `Contexto: ${bench.context}`,
        `Tarea: ${bench.prompt}`,
        `Restricciones:`,
        ...bench.constraints.map((c) => `- ${c}`),
        `Criterios de aceptación:`,
        ...bench.acceptance.map((c) => `- ${c}`),
        ``,
        `REGLA ABSOLUTA: escribe TODOS los archivos generados bajo el directorio temporal: ${tmp}`,
        `PROHIBIDO crear, modificar o eliminar cualquier otro archivo del workspace.`,
        `Si alguna herramienta pide confirmación fuera de ${tmp}, deniégala.`,
        ``,
        skillBlock ? `Skills a aplicar:\n${skillBlock}` : `Skills sugeridas: ${validSkills.join(', ') || bench.expected_skills.join(', ')}`,
      ].join('\n');

      const deadline = Date.now() + get().timeoutMs;
      // Contrato skills[] (OpenAPI 2.2.4): best-effort; si el servidor lo
      // rechaza (skill no registrada en ese directorio), reintento sin skills.
      try {
        await client.sendPromptFull(sessionId, { text: prompt, skills: validSkills.length ? validSkills : undefined });
      } catch (e) {
        if (validSkills.length && String(e).includes('/prompt')) {
          await client.sendPrompt(sessionId, prompt);
        } else {
          throw e;
        }
      }

      // Espera con polling: permisos (denegar fuera del tmp), mensajes, timeout, cancelación.
      let transcript = '';
      const normTmp = tmp.replace(/\//g, '\\').toLowerCase();
      for (;;) {
        if (get().cancelReq[runId]) {
          await client.interrupt(sessionId).catch(() => {});
          await invoke('eval_update_run', { id: runId, patch: { status: 'cancelada', finishedAt: Math.floor(Date.now() / 1000), durationMs: Date.now() - t0, error: 'Cancelada por el usuario' } }).catch(() => {});
          return;
        }
        if (Date.now() > deadline) {
          await client.interrupt(sessionId).catch(() => {});
          await invoke('eval_update_run', { id: runId, patch: { status: 'cumplido-timeout', finishedAt: Math.floor(Date.now() / 1000), durationMs: Date.now() - t0, error: `Timeout de ${Math.round(get().timeoutMs / 60000)} min` } }).catch(() => {});
          return;
        }
        // Guardia de permisos: denegar automáticamente SOLO lo fuera del tmpdir.
        try {
          const perms = await client.listPermissions(sessionId);
          for (const p of perms as Array<{ id: string; resources?: string[] }>) {
            const res = (p.resources ?? []).join(' ').replace(/\//g, '\\').toLowerCase();
            const inside = res.includes(normTmp);
            if (!inside) {
              await client.replyPermission(sessionId, p.id, 'deny', `Benchmark ${runId}: fuera del tmpdir`).catch(() => {});
            }
          }
        } catch { /* best-effort */ }
        // Mensajes: ¿hay respuesta del asistente con contenido?
        try {
          const msgs = await client.listMessages(sessionId, 50);
          const assistants = (msgs as Array<{ role?: string } & Record<string, unknown>>)
            .filter((m) => m.role === 'assistant' || m.role === 'assistant-message');
          const texts = assistants.map((m) => extractText(m as never)).filter((t) => t.trim());
          if (texts.length > 0) {
            transcript = texts.join('\n\n').slice(0, 60000);
            // Heurística de fin: última actividad hace >20 s. Reconsultar una vez más.
            await new Promise((r) => setTimeout(r, 20000));
            if (get().cancelReq[runId]) {
              await client.interrupt(sessionId).catch(() => {});
              await invoke('eval_update_run', { id: runId, patch: { status: 'cancelada', finishedAt: Math.floor(Date.now() / 1000), durationMs: Date.now() - t0 } }).catch(() => {});
              return;
            }
            const msgs2 = await client.listMessages(sessionId, 50).catch(() => msgs);
            const texts2 = (msgs2 as Array<never>).map(() => '').length; // mantener conteo simple
            void texts2;
            break;
          }
        } catch { /* reintentar */ }
        await new Promise((r) => setTimeout(r, 3000));
      }

      // Recoger transcript final + archivos.
      try {
        const msgs = await client.listMessages(sessionId, 100);
        const texts = (msgs as Array<Record<string, unknown>>)
          .filter((m) => m['role'] === 'assistant' || m['role'] === 'assistant-message')
          .map((m) => extractText(m as never)).filter((t) => t.trim());
        if (texts.length) transcript = texts.join('\n\n').slice(0, 120000);
      } catch { /* transcript parcial */ }

      const files = await invoke<Array<{ rel: string; size: number }>>('eval_list_tmpfiles', { tmp }).catch(() => []);
      const luauFiles = files.filter((f) => f.rel.endsWith('.luau') || f.rel.endsWith('.lua'));

      // Checks deterministas.
      const outcomes: AutoCheckOutcome[] = [];
      for (const ch of bench.auto_checks) {
        if (ch.kind === 'files_exist') {
          const hit = files.some((f) => f.rel === ch.param || f.rel.endsWith('/' + ch.param));
          outcomes.push({ kind: ch.kind, param: ch.param, weight: ch.weight, passed: hit, detail: hit ? `existe ${ch.param}` : `falta ${ch.param}` });
        } else if (ch.kind === 'min_files') {
          const [n, ext] = ch.param.split('|');
          const need = parseInt(n, 10) || 0;
          const got = files.filter((f) => !ext || f.rel.endsWith('.' + ext)).length;
          outcomes.push({ kind: ch.kind, param: ch.param, weight: ch.weight, passed: got >= need, detail: `${got}/${need} archivos${ext ? ' .' + ext : ''}` });
        } else if (ch.kind === 'min_lines') {
          const need = parseInt(ch.param, 10) || 0;
          let total = 0;
          let readable = 0;
          for (const f of luauFiles.slice(0, 40)) {
            const c = await readTmp(tmp, f.rel);
            if (c !== null) { total += c.split('\n').length; readable++; }
          }
          outcomes.push({ kind: ch.kind, param: ch.param, weight: ch.weight, passed: readable ? total >= need : null, detail: readable ? `${total}/${need} líneas en ${readable} archivos` : 'sin archivos legibles (no evaluable)' });
        } else if (ch.kind === 'lua_parseable') {
          if (!luauFiles.length) {
            outcomes.push({ kind: ch.kind, param: ch.param, weight: ch.weight, passed: null, detail: 'sin .luau generados (no evaluable)' });
          } else {
            const bad: string[] = [];
            for (const f of luauFiles.slice(0, 40)) {
              const c = await readTmp(tmp, f.rel);
              if (c === null) continue;
              const r = luaBalanceHeuristic(c);
              if (!r.ok) bad.push(`${f.rel}: ${r.detail}`);
            }
            outcomes.push({ kind: ch.kind, param: ch.param, weight: ch.weight, passed: bad.length === 0, detail: bad.length ? bad.join('; ') + ' (heurística, no sustituye a selene)' : `${luauFiles.length} archivos con balance correcto (heurística)` });
          }
        }
      }
      const autoOk = autoVerdict(outcomes);
      const autoWeight = bench.auto_checks.reduce((a, c) => a + c.weight, 0) || 1;
      const autoScore = outcomes.reduce((a, o) => a + (o.passed === true ? o.weight : 0), 0) / autoWeight * 100;

      // Juicio semántico en sesión INDEPENDIENTE (etiquetado; nunca la única fuente).
      let semantic: Record<string, unknown> | null = null;
      if (get().semanticJudge) {
        try {
          const judge = await client.createSession({ title: `EVAL-JUEZ ${runId.slice(-6)}`, directory: tmp });
          const fileDigest = await Promise.all(luauFiles.slice(0, 12).map(async (f) => {
            const c = await readTmp(tmp, f.rel);
            return `--- ${f.rel} ---\n${(c ?? '').slice(0, 4000)}`;
          }));
          const jprompt = [
            `Actúa como JUEZ de benchmark. No generes archivos, solo evalúa.`,
            `Benchmark: ${bench.name}. Objetivo: ${bench.objective}`,
            `Criterios de aceptación:`,
            ...bench.acceptance.map((c) => `- ${c}`),
            `Archivos generados (${files.length}):`,
            ...fileDigest,
            `Responde SOLO con JSON válido: {"overall":0-100,"especializacion":0-100,"completitud":0-100,"aplicabilidad":0-100,"consistencia":0-100,"strengths":[],"issues":[],"recommendations":[]}.`,
            `Si no puedes evaluar un campo, omítelo (no inventes).`,
          ].join('\n').slice(0, 60000);
          await client.sendPrompt(judge.id, jprompt);
          const jd = Date.now() + 180000;
          let jtext = '';
          while (Date.now() < jd) {
            if (get().cancelReq[runId]) break;
            const jm = await client.listMessages(judge.id, 20).catch(() => []);
            const jt = (jm as Array<Record<string, unknown>>)
              .filter((m) => m['role'] === 'assistant' || m['role'] === 'assistant-message')
              .map((m) => extractText(m as never)).join('\n');
            if (jt.trim()) { jtext = jt; break; }
            await new Promise((r) => setTimeout(r, 5000));
          }
          const m = jtext.match(/\{[\s\S]*\}/);
          if (m) {
            try {
              const parsed = JSON.parse(m[0]) as Record<string, unknown>;
              semantic = { ...parsed, _judge: 'OpenCode (sesión independiente)', _run: runId };
            } catch { semantic = { _judge: 'OpenCode', _parse: 'respuesta no JSON: sin juicio (no inventado)', _raw: jtext.slice(0, 2000) }; }
          } else {
            semantic = { _judge: 'OpenCode', _parse: 'sin respuesta del juez (no inventado)' };
          }
          await client.deleteSession(judge.id).catch(() => {});
        } catch (e) {
          semantic = { _judge: 'OpenCode', _error: String(e).slice(0, 300) };
        }
      }

      // Verificar que las skills originales no cambiaron.
      let tampered: string[] = [];
      try {
        const after: EvalSkill[] = await invoke('eval_list_skills', { query: null, grp: null, origin: null, status: null });
        const pre = (run as RunDetail & { preHashes?: Map<string, string> }).preHashes;
        if (pre) {
          for (const s of after) {
            if (pre.has(s.id) && pre.get(s.id) !== s.hash) tampered.push(s.id);
          }
        }
      } catch { /* best-effort */ }

      // Dims → score honesto.
      const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : null);
      const dims: Record<DimId, { score: number | null; evidence?: string }> = {
        tecnica: { score: outcomes.some((o) => o.passed !== null) ? Math.round(autoScore * 10) / 10 : null, evidence: outcomes.map((o) => `${o.kind}(${o.param}):${o.passed === null ? 'N/E' : o.passed ? 'ok' : 'FALLO'} ${o.detail}`).join(' | ').slice(0, 2000) },
        resultado: { score: num(semantic?.['overall']) ?? (outcomes.some((o) => o.passed !== null) ? Math.round(autoScore * 10) / 10 : null), evidence: semantic ? 'juicio semántico independiente + checks' : 'solo checks automáticos' },
        especializacion: { score: num(semantic?.['especializacion']), evidence: semantic ? 'juez' : undefined },
        completitud: { score: num(semantic?.['completitud']), evidence: semantic ? 'juez' : undefined },
        aplicabilidad: { score: num(semantic?.['aplicabilidad']), evidence: semantic ? 'juez' : undefined },
        consistencia: { score: num(semantic?.['consistencia']), evidence: semantic ? 'juez' : undefined },
      };
      const verdict0 = tampered.length > 0 ? 'BLOCKED' as const : undefined;
      const sc = computeScore(dims, { criticalCount, autoOk });
      const verdict = verdict0 ?? sc.verdict;
      const score = verdict0 ? null : sc.score;

      await invoke('eval_update_run', {
        id: runId,
        patch: {
          status: 'completada',
          finishedAt: Math.floor(Date.now() / 1000),
          durationMs: Date.now() - t0,
          transcript: transcript.slice(0, 120000),
          auto_results: JSON.stringify({ outcomes, autoScore: Math.round(autoScore * 10) / 10, files: files.length, source: 'determinista' }).slice(0, 60000),
          semantic: semantic ? JSON.stringify(semantic).slice(0, 60000) : null,
          score, coverage: sc.coverage, verdict,
          error: tampered.length ? `Skills originales modificadas durante el run: ${tampered.join(', ')}` : null,
        },
      }).catch(() => {});
      // Limpieza segura (solo nuestro tmpdir) salvo fallo/cancelación.
      if (get().cleanupTmp && verdict !== 'BLOCKED') {
        await invoke('eval_cleanup_tmpdir', { tmp }).catch(() => {});
      }
    } catch (e) {
      await invoke('eval_update_run', { id: runId, patch: { status: 'fallida', finishedAt: Math.floor(Date.now() / 1000), durationMs: Date.now() - t0, error: String(e).slice(0, 1000) } }).catch(() => {});
      if (tmp) {
        // En fallo se conserva el tmpdir para inspección (aviso en UI).
      }
    } finally {
      const { cancelReq } = get();
      if (cancelReq[runId]) {
        const next = { ...cancelReq };
        delete next[runId];
        set({ cancelReq: next });
      }
      await refreshRuns().catch(() => {});
      await refreshDashboard().catch(() => {});
      void pump();
    }
  }

  return {
    ready: false,
    skills: [],
    benchmarks: [],
    groups: [],
    dashboard: null,
    runs: [],
    detail: null,
    skillDetail: null,
    q: '',
    grp: 'todos',
    origin: 'todos',
    status: 'todos',
    queue: [],
    activeRunId: null,
    concurrency: 1,
    timeoutMs: 600000,
    semanticJudge: true,
    cleanupTmp: true,
    cancelReq: {},
    busy: false,
    error: null,
    lastEvent: null,

    setFilter: (p) => set(p),
    setRunnerOpts: (p) => set(p),

    refreshAll: async () => {
      set({ busy: true, error: null });
      try {
        await invoke('eval_db_init', {});
        const ws = await getWorkspaceDir().catch(() => '');
        if (ws) {
          await invoke('eval_scan', { workspaceDir: ws }).catch(() => null);
        }
        const [skills, benchmarks, runs, dashboard, groups] = await Promise.all([
          invoke<EvalSkill[]>('eval_list_skills', { query: null, grp: null, origin: null, status: null }).catch(() => [] as EvalSkill[]),
          invoke<Benchmark[]>('eval_list_benchmarks', {}).catch(() => [] as Benchmark[]),
          invoke<RunSummary[]>('eval_list_runs', { limit: 100 }).catch(() => [] as RunSummary[]),
          invoke<Dashboard>('eval_dashboard', {}).catch(() => null as unknown as Dashboard),
          invoke<GroupPair[]>('eval_groups', {}).catch(() => [] as GroupPair[]),
        ]);
        set({ skills, benchmarks, runs, dashboard, groups, ready: true });
        // Suscripción a eventos (una vez).
        if (eventsOff.length === 0) {
          const names = ['skill_registry_updated', 'skill_analysis_started', 'skill_analysis_completed', 'benchmark_queued', 'benchmark_started', 'benchmark_progress', 'benchmark_completed', 'benchmark_failed', 'benchmark_cancelled', 'evaluation_completed', 'regression_detected'];
          for (const n of names) {
            listen(n, (e) => {
              set({ lastEvent: `${n}: ${JSON.stringify(e.payload).slice(0, 160)}` });
              if (n === 'skill_registry_updated' || n === 'skill_analysis_completed') {
                invoke<EvalSkill[]>('eval_list_skills', { query: null, grp: null, origin: null, status: null }).then((s) => set({ skills: s })).catch(() => {});
                refreshDashboard();
              }
              if (n.startsWith('benchmark_') || n === 'evaluation_completed') {
                refreshRuns();
                refreshDashboard();
              }
            }).then((off) => eventsOff.push(off)).catch(() => {});
          }
        }
      } catch (e) {
        set({ error: String(e) });
      } finally {
        set({ busy: false });
      }
    },

    scan: async () => {
      const ws = await getWorkspaceDir();
      if (!ws) throw new Error('Configura el workspace en Configuración');
      const skills = await invoke<EvalSkill[]>('eval_scan', { workspaceDir: ws });
      set({ skills });
      await refreshDashboard();
    },

    analyze: async (skillId?: string) => {
      const ws = await getWorkspaceDir();
      if (!ws) throw new Error('Configura el workspace en Configuración');
      const r = await invoke<{ analyzed: number; critical: number }>('eval_analyze', { workspaceDir: ws, skillId: skillId ?? null });
      const skills = await invoke<EvalSkill[]>('eval_list_skills', { query: null, grp: null, origin: null, status: null }).catch(() => get().skills);
      set({ skills });
      await refreshDashboard();
      return r;
    },

    openSkill: async (id: string) => {
      const skillDetail = await invoke<SkillDetail>('eval_get_skill', { id });
      set({ skillDetail });
    },

    openRun: async (id: string) => {
      const detail = await invoke<RunDetail>('eval_get_run', { id });
      set({ detail });
    },

    queueBenchmark: async (benchmarkId: string, skillIds: string[]) => {
      const ws = await getWorkspaceDir().catch(() => '');
      const client = useSessions.getState().client;
      if (!client) throw new Error('Conecta el servidor OpenCode en Inicio');
      if (!ws) throw new Error('Configura el workspace en Configuración');
      const version = await client.info().then((i) => i.version).catch(() => null);
      const model = useSessions.getState().activeModel;
      const id = shortId('run');
      await invoke('eval_save_run', {
        run: {
          id, benchmarkId, skillIds,
          opencodeVersion: version,
          model: model ? `${model.providerID}/${model.id}` : null,
          config: JSON.stringify({ timeoutMs: get().timeoutMs, semanticJudge: get().semanticJudge, cleanupTmp: get().cleanupTmp }),
          promptExcerpt: null, tmpDir: null, sessionId: null,
        },
      });
      set({ queue: [...get().queue, id] });
      void pump();
      await refreshRuns();
      return id;
    },

    cancelRun: async (runId: string) => {
      const { queue, activeRunId } = get();
      if (queue.includes(runId)) {
        set({ queue: queue.filter((q) => q !== runId) });
        await invoke('eval_update_run', { id: runId, patch: { status: 'cancelada', finishedAt: Math.floor(Date.now() / 1000), error: 'Cancelada en cola' } }).catch(() => {});
        await refreshRuns();
        return;
      }
      if (activeRunId === runId) {
        set({ cancelReq: { ...get().cancelReq, [runId]: true } });
      }
    },

    cleanupRunTmp: async (runId: string) => {
      const d = await invoke<RunDetail>('eval_get_run', { id: runId });
      if (!d.tmp_dir) throw new Error('Sin tmpdir registrado');
      await invoke('eval_cleanup_tmpdir', { tmp: d.tmp_dir });
      await refreshRuns();
    },

    compareRuns: async (a: string, b: string) => invoke('eval_compare_runs', { a, b }),
    history: async (skillId: string) => invoke('eval_skill_history', { skillId }),
    exportReport: async (kind: string, format: string) =>
      invoke<{ filename: string; content: string }>('eval_export', { kind, format }),
  };
});
