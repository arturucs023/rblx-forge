// Monitor de ejecución en vivo: qué agente trabaja, en qué, con qué modelo,
// herramientas/llamadas, archivos, errores. Expandible por tarea.
import { useState } from 'react';
import { useOrch } from '../../stores/orch';
import { AgentGlyph, Empty, StateBadge, fmtTs, fmtDur } from './common';

export function Monitor() {
  const tasks = useOrch((s) => s.tasks);
  const execs = useOrch((s) => s.execs);
  const messages = useOrch((s) => s.messages);
  const cancelRun = useOrch((s) => s.cancelRun);
  const activeRunId = useOrch((s) => s.activeRunId);
  const runDetail = useOrch((s) => s.runDetail);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  if (!activeRunId) {
    return <Empty title="Sin ejecución seleccionada" hint="Elige una ejecución en el Panel para monitorizarla en vivo." />;
  }
  const live = tasks.filter((t) => ['RUNNING', 'WAITING_APPROVAL'].includes(t.state));
  const recent = [...messages].slice(-30).reverse();

  return (
    <div className="grid gap-2 p-3 xl:grid-cols-2">
      <div className="card anim-enter p-3">
        <div className="mb-2 flex items-center gap-2">
          <p className="section-label">Tareas activas ({live.length})</p>
          {runDetail?.status === 'en_ejecucion' && (
            <button onClick={() => cancelRun(activeRunId)} className="btn btn-ghost ml-auto !text-forge-err">Cancelar ejecución</button>
          )}
        </div>
        {live.length === 0 && <p className="text-[12px] text-forge-muted">Nada en marcha. Lanza la ejecución desde Plan (requiere plan aprobado).</p>}
        {live.map((t) => {
          const ex = [...execs].filter((e) => e.task_id === t.id).pop();
          const isOpen = open[t.id] ?? true;
          return (
            <div key={t.id} className="mb-2 rounded border border-forge-border-soft p-2">
              <button onClick={() => setOpen((o) => ({ ...o, [t.id]: !isOpen }))} className="flex w-full items-center gap-2 text-left">
                <span className="text-forge-accent">{isOpen ? '▾' : '▸'}</span>
                <AgentGlyph id={t.agent_id} />
                <span className="min-w-0 flex-1 truncate text-[13px] font-bold">{t.name}</span>
                <StateBadge state={t.state} />
              </button>
              {isOpen && (
                <div className="mono mt-1 pl-5 text-[11px] text-forge-muted">
                  <div>agente: {t.agent_id} · skills: {t.skills.join(', ') || '—'}</div>
                  <div>modelo: {ex?.model ?? 'heredado de sesión'} · intento {ex?.attempt ?? t.attempts}</div>
                  <div>sesión: {t.session_id ? `${t.session_id.slice(0, 18)}…` : '—'} · inicio: {ex ? fmtTs(ex.started_at) : fmtTs(t.created_at)}</div>
                  {t.error && <div className="text-forge-err">{t.error}</div>}
                  {t.result && <div className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap rounded bg-forge-bg p-1.5">{t.result.slice(0, 1500)}</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="card anim-enter p-3">
        <p className="section-label mb-2">Actividad reciente (mensajes entre agentes)</p>
        {recent.length === 0 && <p className="text-[12px] text-forge-muted">Sin mensajes todavía. Aquí verás asignaciones, inicios, bloqueos y revisiones.</p>}
        {recent.map((m) => (
          <div key={m.id} className="mono mb-1.5 border-b border-forge-border-soft pb-1 text-[11px]">
            <span className="text-forge-faint">{fmtTs(m.created_at)}</span>{' '}
            <span className="rounded bg-forge-panel3 px-1 text-forge-accent">{m.kind}</span>{' '}
            <span className="text-forge-text">{m.from} → {m.to}</span>
            <div className="mt-0.5 break-words text-forge-muted">{m.content.slice(0, 400)}</div>
          </div>
        ))}
        <p className="section-label mb-1 mt-3">Ejecuciones ({execs.length})</p>
        {execs.slice(-10).reverse().map((e) => (
          <div key={e.id} className="mono mb-1 flex gap-2 text-[11px] text-forge-muted">
            <span className="shrink-0">{fmtTs(e.started_at)}{e.finished_at ? ` → ${fmtDur((e.finished_at - e.started_at) * 1000)}` : ''}</span>
            <span className="min-w-0 flex-1 truncate">{e.agent_id} · intento {e.attempt}</span>
            <StateBadge state={e.status === 'RUNNING' ? 'RUNNING' : e.status === 'COMPLETED' ? 'COMPLETED' : e.status === 'FAILED' ? 'FAILED' : 'CANCELLED'} />
          </div>
        ))}
      </div>
    </div>
  );
}
