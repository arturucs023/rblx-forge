// Runs: cola, activas, historial, detalle (auto vs semántico), cancelación, limpieza.
import { useState } from 'react';
import { useEval } from '../../stores/eval';
import { VERDICT_LABELS } from '../../lib/eval/types';

function AutoBadge({ source }: { source?: string }) {
  const auto = source === 'determinista';
  return <span className={`mono rounded px-1 text-[10px] ${auto ? 'bg-forge-ok-soft text-forge-ok' : 'bg-forge-info-soft text-forge-info'}`}>{auto ? 'AUTO' : 'SEMÁNTICO'}</span>;
}

export function Runs() {
  const runs = useEval((s) => s.runs);
  const queue = useEval((s) => s.queue);
  const activeRunId = useEval((s) => s.activeRunId);
  const detail = useEval((s) => s.detail);
  const openRun = useEval((s) => s.openRun);
  const cancelRun = useEval((s) => s.cancelRun);
  const cleanupRunTmp = useEval((s) => s.cleanupRunTmp);
  const concurrency = useEval((s) => s.concurrency);
  const timeoutMs = useEval((s) => s.timeoutMs);
  const semanticJudge = useEval((s) => s.semanticJudge);
  const cleanupTmp = useEval((s) => s.cleanupTmp);
  const setRunnerOpts = useEval((s) => s.setRunnerOpts);
  const [msg, setMsg] = useState<string | null>(null);

  const cancel = async (id: string) => {
    setMsg(null);
    try {
      await cancelRun(id);
    } catch (e) {
      setMsg(String(e));
    }
  };
  const cleanup = async (id: string) => {
    setMsg(null);
    try {
      await cleanupRunTmp(id);
      setMsg('Tmpdir eliminado (solo el del run).');
    } catch (e) {
      setMsg(String(e));
    }
  };

  return (
    <div className="flex h-full flex-col p-3 lg:flex-row lg:gap-3">
      <div className="min-w-0 flex-1">
        <div className="card mb-2 flex flex-wrap items-center gap-2 p-2 text-[12px]">
          <span className="font-bold text-forge-muted">Runner</span>
          <label className="flex items-center gap-1">Concurrencia
            <select value={concurrency} onChange={(e) => setRunnerOpts({ concurrency: Number(e.target.value) })} className="rounded border border-forge-border bg-forge-bg px-1 py-0.5">
              <option value={1}>1</option>
              <option value={2}>2 máx</option>
            </select>
          </label>
          <label className="flex items-center gap-1">Timeout
            <select value={timeoutMs} onChange={(e) => setRunnerOpts({ timeoutMs: Number(e.target.value) })} className="rounded border border-forge-border bg-forge-bg px-1 py-0.5">
              <option value={300000}>5 min</option>
              <option value={600000}>10 min</option>
              <option value={1200000}>20 min</option>
            </select>
          </label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={semanticJudge} onChange={(e) => setRunnerOpts({ semanticJudge: e.target.checked })} /> juez semántico</label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={cleanupTmp} onChange={(e) => setRunnerOpts({ cleanupTmp: e.target.checked })} /> limpiar tmpdir</label>
          <span className="mono ml-auto text-[11px] text-forge-faint">cola: {queue.length} · activa: {activeRunId ?? '—'}</span>
        </div>
        {msg && <p className="mb-2 text-[12px] text-forge-muted">{msg}</p>}
        {runs.length === 0 && (
          <div className="card p-3 text-center text-[12px] text-forge-muted">Sin runs. Lanza un benchmark desde la pestaña Benchmarks: verás aquí la cola, el progreso y el resultado.</div>
        )}
        <div className="min-h-0 overflow-auto rounded border border-forge-border">
          <table className="w-full text-[12px]">
            <thead className="sticky top-0 bg-forge-panel3 text-left text-forge-muted">
              <tr><th className="px-2 py-1">Run</th><th className="px-2 py-1">Benchmark</th><th className="px-2 py-1">Estado</th><th className="px-2 py-1 text-right">Score</th><th className="px-2 py-1">Veredicto</th><th className="px-2 py-1" /></tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id} className={`border-t border-forge-border-soft hover:bg-forge-panel2 ${detail?.id === r.id ? 'bg-forge-panel2' : ''}`}>
                  <td className="mono px-2 py-1 text-[11px]">{r.id}<div className="text-forge-faint">{new Date(r.created_at * 1000).toLocaleString()}</div></td>
                  <td className="px-2 py-1"><div className="max-w-52 truncate">{r.benchmark_id}</div><div className="mono max-w-52 truncate text-[10px] text-forge-faint">{r.skill_ids.join('+')}</div></td>
                  <td className="px-2 py-1"><span className={r.status === 'completada' ? 'text-forge-ok' : r.status === 'activa' || r.status === 'en-cola' ? 'text-forge-warn' : 'text-forge-err'}>{r.status}</span>{r.error && <div className="max-w-52 truncate text-[10px] text-forge-err" title={r.error}>{r.error}</div>}</td>
                  <td className="mono px-2 py-1 text-right">{typeof r.score === 'number' ? r.score.toFixed(1) : '—'}</td>
                  <td className="px-2 py-1 text-[11px] text-forge-muted">{r.verdict ? (VERDICT_LABELS[r.verdict] ?? r.verdict) : '—'}</td>
                  <td className="px-2 py-1 text-right">
                    <button onClick={() => openRun(r.id)} className="btn btn-ghost mr-1 !px-2 !py-0.5">Ver</button>
                    {(r.status === 'en-cola' || r.status === 'activa') && <button onClick={() => cancel(r.id)} className="btn btn-ghost !px-2 !py-0.5">Cancelar</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="mt-2 w-full shrink-0 lg:mt-0 lg:w-[26rem]">
        {!detail && <p className="card p-3 text-[12px] text-forge-muted">Selecciona «Ver» en una run para el detalle: transcript, checks, juicio, score y cobertura.</p>}
        {detail && (
          <div className="card anim-enter max-h-full overflow-auto p-3">
            <p className="mono text-[11px] text-forge-accent">{detail.id}</p>
            <p className="text-[13px] font-bold">{detail.benchmark_id}</p>
            <p className="mono text-[11px] text-forge-faint">skills: {detail.skill_ids.join(', ') || '—'} · modelo: {detail.model ?? '—'} · OpenCode: {detail.opencode_version ?? '—'}</p>
            <p className="mono text-[11px] text-forge-faint">duración: {detail.duration_ms !== null && detail.duration_ms !== undefined ? `${Math.round(detail.duration_ms / 1000)}s` : '—'} · cobertura: {typeof detail.coverage === 'number' ? `${Math.round(detail.coverage * 100)}%` : '—'} · score: {typeof detail.score === 'number' ? detail.score.toFixed(1) : 'sin puntuación (incompleta o bloqueada)'}</p>
            {detail.tmp_dir && <p className="mono break-all text-[10px] text-forge-faint">tmp: {detail.tmp_dir} <button onClick={() => cleanup(detail.id)} className="btn btn-ghost ml-1 !px-2 !py-0">Eliminar tmpdir</button></p>}
            {detail.error && <p className="mt-1 text-[12px] text-forge-err">{detail.error}</p>}
            <p className="section-label mb-1 mt-2">Checks deterministas <AutoBadge source="determinista" /></p>
            {!detail.auto_results && <p className="text-[12px] text-forge-muted">Sin resultados automáticos.</p>}
            {detail.auto_results && (() => {
              try {
                const a = JSON.parse(detail.auto_results) as { outcomes: Array<{ kind: string; param: string; passed: boolean | null; detail: string }>; autoScore: number; files: number };
                return (
                  <div>
                    <p className="mono text-[11px] text-forge-muted">autoScore: {a.autoScore} · archivos: {a.files}</p>
                    {a.outcomes.map((o, i) => (
                      <div key={i} className="mono text-[11px] text-forge-muted">[{o.passed === null ? 'N/E' : o.passed ? 'OK' : 'FALLO'}] {o.kind}({o.param}) — {o.detail}</div>
                    ))}
                  </div>
                );
              } catch {
                return <p className="mono text-[11px] text-forge-muted">{detail.auto_results.slice(0, 500)}</p>;
              }
            })()}
            <p className="section-label mb-1 mt-2">Juicio semántico <AutoBadge source="x" /> <span className="font-normal normal-case">sesión independiente, nunca la única fuente</span></p>
            {!detail.semantic && <p className="text-[12px] text-forge-muted">Sin juicio (desactivado o no disponible). Los criterios semánticos quedan NOT_EVALUATED, no 0.</p>}
            {detail.semantic && (() => {
              try {
                const s = JSON.parse(detail.semantic) as Record<string, unknown>;
                return (
                  <div className="text-[12px]">
                    {['overall', 'especializacion', 'completitud', 'aplicabilidad', 'consistencia'].map((k) => (
                      typeof s[k] === 'number' ? <div key={k} className="mono text-[11px] text-forge-muted">{k}: {s[k] as number}</div> : null
                    ))}
                    {Array.isArray(s['issues']) && (s['issues'] as string[]).map((x, i) => <p key={i} className="text-forge-warn">· {x}</p>)}
                    {Array.isArray(s['recommendations']) && (s['recommendations'] as string[]).map((x, i) => <p key={i} className="text-forge-muted">→ {x}</p>)}
                    {typeof s['_parse'] === 'string' && <p className="text-forge-muted">{s['_parse'] as string}</p>}
                  </div>
                );
              } catch {
                return <p className="mono text-[11px] text-forge-muted">{detail.semantic.slice(0, 800)}</p>;
              }
            })()}
            {detail.transcript && <details className="mt-2"><summary className="cursor-pointer text-[12px] text-forge-muted">Transcript ({detail.transcript.length} caracteres)</summary><pre className="mono mt-1 max-h-64 overflow-auto whitespace-pre-wrap text-[11px] text-forge-muted">{detail.transcript.slice(0, 8000)}</pre></details>}
          </div>
        )}
      </div>
    </div>
  );
}
