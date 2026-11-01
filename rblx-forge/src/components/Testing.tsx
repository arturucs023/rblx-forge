import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useProjects } from '../stores/projects';
import { parseSelene, parseStyluaCheck, type Diagnostic } from '../lib/diagnostics';

interface LintRun {
  ts: string;
  tool: string;
  success: boolean;
  findings: number;
  durationMs: number;
}

// Centro de pruebas: ejecuta herramientas REALES y guarda historial.
// Sin métricas inventadas: sin ejecutor TestEZ en Studio no hay tests de
// juego; multijugador requiere Studio abierto (pendiente explícito).
export function Testing() {
  const active = useProjects((s) => s.active);
  const [diags, setDiags] = useState<Diagnostic[]>([]);
  const [styluaFiles, setStyluaFiles] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<LintRun[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    invoke<LintRun[] | null>('settings_get', { key: 'testing.history' })
      .then((v) => { if (Array.isArray(v)) setHistory(v); })
      .catch(() => {});
  }, []);

  const saveHistory = async (runs: LintRun[]) => {
    const h = [...runs, ...history].slice(0, 20);
    setHistory(h);
    try {
      await invoke('settings_set', { key: 'testing.history', value: h });
    } catch { /* best-effort */ }
  };

  const runAll = async () => {
    if (!active) return;
    setBusy(true);
    setError(null);
    setDiags([]);
    setStyluaFiles([]);
    const t0 = Date.now();
    const runs: LintRun[] = [];
    try {
      const se = await invoke<{ success: boolean; stdout: string; stderr: string }>('project_lint', { projectDir: active.path, tool: 'selene' });
      const d = parseSelene(se.stdout + '\n' + se.stderr);
      setDiags(d);
      runs.push({ ts: new Date().toISOString(), tool: 'selene', success: se.success, findings: d.length, durationMs: Date.now() - t0 });
      const st = await invoke<{ success: boolean; stdout: string; stderr: string }>('project_lint', { projectDir: active.path, tool: 'stylua' });
      const f = parseStyluaCheck(st.stdout + '\n' + st.stderr);
      setStyluaFiles(f.map((x) => x.file));
      runs.push({ ts: new Date().toISOString(), tool: 'stylua --check', success: st.success, findings: f.length, durationMs: Date.now() - t0 });
      await saveHistory(runs);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  if (!active) return <p className="p-3 text-forge-muted">Abre un proyecto para ejecutar pruebas.</p>;

  return (
    <div className="flex h-full">
      <div className="min-w-0 flex-1 overflow-auto p-3">
        <div className="mb-2 flex items-center gap-2">
          <p className="font-bold">Centro de pruebas · <span className="mono font-normal text-forge-muted">{active.name}</span></p>
          <button onClick={runAll} disabled={busy} className="ml-auto rounded bg-forge-accent px-3 py-1 text-[12px] font-bold text-black disabled:opacity-50">
            {busy ? 'Ejecutando…' : 'Ejecutar Selene + StyLua'}
          </button>
        </div>
        {error && <p className="mb-2 text-forge-err">{String(error).slice(0, 400)}</p>}
        <div className="mb-2 rounded border border-forge-border bg-forge-panel p-2 text-[12px]">
          <p className="mb-1 font-bold text-forge-muted">HALLAZGOS ({diags.length} selene · {styluaFiles.length} archivos con formato pendiente)</p>
          {diags.map((d, i) => (
            <div key={i} className="mono break-words text-[11px]">
              <span className={d.severity === 'error' ? 'text-forge-err' : 'text-forge-warn'}>[{d.severity}]</span> {d.file}:{d.line}:{d.col} {d.code && `(${d.code})`} {d.message.slice(0, 200)}
            </div>
          ))}
          {styluaFiles.map((f) => <div key={f} className="mono text-[11px] text-forge-warn">[formato] {f}</div>)}
        </div>
        <div className="rounded border border-forge-border bg-forge-panel p-2 text-[12px]">
          <p className="mb-1 font-bold text-forge-muted">HISTORIAL ({history.length})</p>
          {history.length === 0 && <p className="text-forge-muted">Sin ejecuciones registradas.</p>}
          {history.map((h, i) => (
            <div key={i} className="mono text-[11px] text-forge-muted">
              {h.ts.slice(0, 19).replace('T', ' ')} · {h.tool} · {h.success ? <span className="text-forge-ok">OK</span> : <span className="text-forge-err">con hallazgos</span>} · {h.findings} · {h.durationMs}ms
            </div>
          ))}
        </div>
        <div className="mt-2 rounded border border-forge-warn p-2 text-[12px]">
          <p className="font-bold text-forge-warn">Pendiente (no simulado)</p>
          <p className="text-forge-muted">TestEZ: configurado en el proyecto pero sin ejecutor en Studio. Multijugador: requiere Studio con playtest activo y MCP habilitado. Cobertura: sin medir (no se inventa).</p>
        </div>
      </div>
    </div>
  );
}
