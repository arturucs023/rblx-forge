// Aceptación del Multi-Agent Orchestrator (E2E real, sin mocks).
// Flujo: plan(3 tareas architect→luau→qa) → sesiones OpenCode reales en
// servidor PROPIO → archivos en proyecto temporal → validación real
// (selene vendoreado + heurística) → revisión con veredicto JSON → informe.
// Limpieza: solo el PID propio (vía /api/info), tmp eliminado.
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

const PORT = 28983;
const BASE = `http://127.0.0.1:${PORT}`;
const ROOT = process.cwd();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let AUTH = {};

async function api(p, opts = {}) {
  const res = await fetch(BASE + p, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...AUTH, ...(opts.headers || {}) },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${opts.method || 'GET'} ${p} -> ${res.status}: ${text.slice(0, 200)}`);
  if (!text) return null;
  const j = JSON.parse(text);
  return j && typeof j === 'object' && 'data' in j ? j.data : j;
}

function hashSkills() {
  const h = crypto.createHash('sha256');
  for (const scope of ['.agents/skills', '.opencode/skills']) {
    const base = path.join(ROOT, scope);
    if (!fs.existsSync(base)) continue;
    for (const id of fs.readdirSync(base).sort()) {
      const sk = path.join(base, id, 'SKILL.md');
      if (fs.existsSync(sk)) h.update(fs.readFileSync(sk));
    }
  }
  return h.digest('hex');
}

function excerpt(id) {
  for (const scope of ['.agents/skills', '.opencode/skills']) {
    const sk = path.join(ROOT, scope, id, 'SKILL.md');
    if (fs.existsSync(sk)) return fs.readFileSync(sk, 'utf8').slice(0, 4000);
  }
  throw new Error(`skill inexistente en disco: ${id}`);
}

function listFiles(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) listFiles(p, out);
    else out.push(path.relative(dir, p));
  }
  return out;
}

async function runTask(sid, prompt, timeoutMs) {
  await api(`/api/session/${sid}/prompt`, { method: 'POST', body: JSON.stringify({ text: prompt }) });
  const deadline = Date.now() + timeoutMs;
  let last = '';
  while (Date.now() < deadline) {
    await sleep(3000);
    const msgs = await api(`/api/session/${sid}/message?limit=60&order=asc`);
    const texts = [];
    for (const m of msgs) {
      if (typeof m.text === 'string' && m.text.trim()) texts.push(m.text.trim());
      for (const p of m.content || m.parts || []) {
        if (p && typeof p.text === 'string' && p.text.trim() && p.type !== 'reasoning') texts.push(p.text.trim());
      }
    }
    const mine = texts.filter((t) => !t.startsWith('Eres '));
    if (mine.length) {
      last = mine.join('\n\n');
      await sleep(12000);
      return last.slice(0, 60000);
    }
  }
  throw new Error('timeout esperando respuesta del modelo');
}

(async () => {
  const log = (k, v) => console.log(`[ORCH-TEST] ${k}: ${v}`);
  try { await fetch(BASE + '/api/info'); throw new Error(`puerto ${PORT} ocupado`); }
  catch (e) { if (String(e.message).startsWith('puerto')) throw e; }

  // 0. Las skills de los 10 perfiles existen de verdad (parse del seed).
  const src = fs.readFileSync(path.join(ROOT, 'rblx-forge', 'src-tauri', 'src', 'orch.rs'), 'utf8');
  const seedSkills = [...src.matchAll(/skills: &\[(.*?)\]/g)].flatMap((m) => [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]));
  const uniq = [...new Set(seedSkills)];
  const missing = uniq.filter((id) => !fs.existsSync(path.join(ROOT, '.agents', 'skills', id, 'SKILL.md')) && !fs.existsSync(path.join(ROOT, '.opencode', 'skills', id, 'SKILL.md')));
  if (!uniq.length) throw new Error('seed sin skills');
  if (missing.length) throw new Error(`skills del seed inexistentes: ${missing.join(',')}`);
  log('0 perfiles', `10 integrados, ${uniq.length} skill IDs verificadas en disco`);

  // 1. Servidor propio.
  const before = hashSkills();
  let bin;
  try { bin = execSync('where opencode').toString().split('\n')[0].trim(); }
  catch { throw new Error('opencode no detectado'); }
  const child = spawn(`"${bin}.cmd" serve --hostname 127.0.0.1 --port ${PORT}`, { stdio: ['ignore', 'pipe', 'pipe'], shell: true, cwd: os.tmpdir() });
  let password = null, out = '';
  child.stdout.on('data', (d) => { out += d.toString(); const m = out.match(/server password (\S+)/); if (m) password = m[1]; });
  child.stderr.on('data', () => {});
  for (let i = 0; i < 100 && !password; i++) await sleep(200);
  if (!password) { try { process.kill(child.pid); } catch {} throw new Error('sin password'); }
  AUTH = { Authorization: 'Basic ' + Buffer.from('opencode:' + password).toString('base64') };
  let info = null;
  for (let i = 0; i < 80; i++) { try { info = await api('/api/info'); break; } catch { await sleep(250); } }
  if (!info) throw new Error('sin /api/info');
  const srvPid = info.pid;
  log('1 servidor', `propio v${info.version} pid=${srvPid}`);

  // 2. Proyecto temporal aislado.
  const tmp = path.join(fs.realpathSync(os.tmpdir()), `forge-orch-acc-${Date.now()}`);
  for (const d of ['src/server', 'src/client', 'src/shared']) fs.mkdirSync(path.join(tmp, d), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'default.project.json'), '{"name":"orch-acc","tree":{"$className":"DataModel"}}');
  const MODEL_CANDIDATES = [
    { id: 'mimo-v2.6-flash-free', providerID: 'opencode' },
    { id: 'glm-5.3-flash-free', providerID: 'opencode' },
    { id: 'deepseek-v4.1-flash-free', providerID: 'opencode' },
  ];
  async function pickModel() {
    for (const m of MODEL_CANDIDATES) {
      try {
        const s = await api('/api/session', { method: 'POST', body: JSON.stringify({ title: 'orch-pick', directory: tmp, model: m }) });
        await api(`/api/session/${s.id}/prompt`, { method: 'POST', body: JSON.stringify({ text: 'Reply with exactly: OK' }) });
        const t0 = Date.now();
        let ok = false;
        while (Date.now() - t0 < 60000) {
          await sleep(3000);
          const msgs = await api(`/api/session/${s.id}/message?limit=10&order=asc`);
          const texts = [];
          for (const mm of msgs) {
            for (const p of mm.content || mm.parts || []) {
              if (p && typeof p.text === 'string' && p.text.trim() && p.type !== 'reasoning') texts.push(p.text.trim());
            }
          }
          if (texts.length) { ok = true; break; }
        }
        await api(`/api/session/${s.id}`, { method: 'DELETE' }).catch(() => {});
        if (ok) return m;
        log('X modelo', `${m.id} sin respuesta en 60s`);
      } catch (e) {
        log('X modelo', `${m.id}: ${String(e.message).slice(0, 100)}`);
      }
    }
    throw new Error('ningún modelo gratuito responde (cuota agotada?)');
  }
  const MODEL = await pickModel();
  log('1b modelo', `${MODEL.providerID}/${MODEL.id}`);

  // Tarea 1 — architect.
  const s1 = await api('/api/session', { method: 'POST', body: JSON.stringify({ title: 'orch-architect', directory: tmp, model: MODEL }) });
  const archPrompt = [
    'Eres Software Architect en una orquestación multiagente. No converses: diseña y entrega.',
    'TAREA: Diseña la arquitectura de un ModuleScript de configuración de juego con validación.',
    'Criterios: módulos separados, --!strict, sin secretos.',
    'Skills (extractos, solo lectura):',
    '--- SKILL luau-core ---', excerpt('luau-core').slice(0, 1500),
    'REGLA ABSOLUTA: escribe SOLO dentro de este directorio.',
    'Al terminar, resume: archivos + cómo verificar.',
  ].join('\n');
  const r1 = await runTask(s1.id, archPrompt, 240000);
  log('2 architect', `${r1.length} caracteres`);

  // Tarea 2 — luau-developer (depende de la 1). Reintento declarado si el modelo gratuito se atasca.
  const s2 = await api('/api/session', { method: 'POST', body: JSON.stringify({ title: 'orch-luaudev', directory: tmp, model: MODEL }) });
  const devPrompt = [
    'Eres Luau Developer en una orquestación multiagente. No converses: implementa.',
    'TAREA: Crea src/shared/GameConfig.luau (valores por defecto + función validate) y src/server/ConfigCheck.server.luau que lo use con pcall.',
    'Contexto del arquitecto (completada):', r1.slice(0, 2000),
    'Skills (extracto):', '--- SKILL roblox-game-systems ---', excerpt('roblox-game-systems').slice(0, 1200),
    'REGLA ABSOLUTA: escribe SOLO dentro de este directorio.',
  ].join('\n');
  let r2 = null, attempts = 0;
  for (;;) {
    attempts++;
    try {
      r2 = await runTask(s2.id, attempts === 1 ? devPrompt : devPrompt + '\nReintento: genera SOLO los dos archivos, sin explicaciones largas.', 240000);
      break;
    } catch (e) {
      if (attempts >= 2) throw e;
      log('3 luau-dev', `reintento ${attempts} (timeout modelo gratuito)`);
    }
  }
  const files = listFiles(tmp).filter((f) => !f.includes('.agents'));
  const lua = files.filter((f) => f.endsWith('.luau') || f.endsWith('.lua'));
  log('3 luau-dev', `${lua.length} .luau (${lua.join(', ') || 'ninguno'})`);
  if (!lua.length) throw new Error('el desarrollador no generó .luau');

  // Validación determinista real: selene vendoreado.
  const selene = path.join(ROOT, 'tools', 'bin', 'selene', 'selene.exe');
  let seleneOut = 'no ejecutado';
  if (fs.existsSync(selene)) {
    try {
      seleneOut = execSync(`"${selene}" --display-style Quiet "${path.join(tmp, 'src')}" 2>&1`, { timeout: 60000 }).toString().slice(0, 500) || 'sin hallazgos';
    } catch (e) {
      seleneOut = (e.stdout || e.message || '').toString().slice(0, 500);
    }
  }
  log('4 selene', seleneOut.slice(0, 160).replace(/\n/g, ' | '));

  // Tarea 3 — qa reviewer en sesión independiente, veredicto JSON.
  const s3 = await api('/api/session', { method: 'POST', body: JSON.stringify({ title: 'orch-qa', directory: tmp, model: MODEL }) });
  const qaPrompt = [
    'Eres QA Engineer, revisor INDEPENDIENTE. No reimplementes.',
    'Archivos generados:', lua.join(', '),
    'Resumen del desarrollador:', r2.slice(0, 4000),
    'Selene:', seleneOut.slice(0, 1000),
    'Responde SOLO con JSON: {"verdict":"APPROVE"|"REJECT","notes":[],"issues":[],"missing":[]}.',
  ].join('\n');
  const r3 = await runTask(s3.id, qaPrompt, 240000);
  const mj = r3.match(/\{[\s\S]*\}/);
  if (!mj) throw new Error('el revisor no devolvió JSON');
  const verdict = JSON.parse(mj[0]);
  log('5 qa', `verdict=${verdict.verdict} issues=${(verdict.issues || []).length}`);

  // 6. Originales intactos + informe + limpieza.
  const after = hashSkills();
  if (before !== after) throw new Error('LAS SKILLS ORIGINALES CAMBIARON');
  log('6 originales', 'hash idéntico');
  const report = { task1_chars: r1.length, task2_chars: r2.length, files: lua, selene: seleneOut.slice(0, 500), verdict, skills_verified: uniq.length };
  fs.writeFileSync(path.join(tmp, 'orch-report.json'), JSON.stringify(report, null, 1));
  for (const s of [s1, s2, s3]) await api(`/api/session/${s.id}`, { method: 'DELETE' }).catch(() => {});
  execSync(`taskkill /F /T /PID ${srvPid}`);
  await sleep(1500);
  let closed = false;
  try { await fetch(BASE + '/api/info'); } catch { closed = true; }
  fs.rmSync(tmp, { recursive: true, force: true });
  log('7 limpieza', `puerto_cerrado=${closed} tmp_eliminado=true`);
  if (!closed) throw new Error('puerto no liberado');
  console.log('[ORCH-TEST] TODO OK');
  process.exit(0);
})().catch((e) => {
  console.error('[ORCH-TEST] FALLO:', e.message);
  try {
    const out = execSync('netstat -ano').toString().split('\n').find((l) => l.includes('127.0.0.1:28983') && l.includes('LISTENING'));
    const pid = out && out.trim().split(/\s+/).pop();
    if (pid && /^\d+$/.test(pid)) { execSync(`taskkill /F /PID ${pid}`); console.error('[ORCH-TEST] limpieza: servidor de prueba eliminado'); }
  } catch {}
  process.exit(1);
});
