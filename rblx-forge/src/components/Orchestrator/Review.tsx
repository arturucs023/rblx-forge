// Revisión: aprobaciones pendientes (riesgo/Studio/reintento), historial de
// revisiones, artefactos generados y auditoría completa.
import { useState } from 'react';
import { useOrch } from '../../stores/orch';
import { Empty, fmtTs } from './common';

export function Review() {
  const approvals = useOrch((s) => s.approvals);
  const messages = useOrch((s) => s.messages);
  const artifacts = useOrch((s) => s.artifacts);
  const audit = useOrch((s) => s.audit);
  const decideApproval = useOrch((s) => s.decideApproval);
  const activeRunId = useOrch((s) => s.activeRunId);
  const [msg, setMsg] = useState<string | null>(null);

  if (!activeRunId) {
    return <Empty title="Sin ejecución" hint="Elige una ejecución para revisar aprobaciones, cambios y auditoría." />;
  }
  const pending = approvals.filter((a) => a.status === 'pendiente');
  const reviews = messages.filter((m) => m.kind.startsWith('REVIEW_')).slice(-20).reverse();

  const decide = async (id: string, approve: boolean) => {
    setMsg(null);
    try {
      await decideApproval(id, approve);
      setMsg(approve ? 'Aprobada.' : 'Rechazada (tarea bloqueada, registrado en auditoría).');
    } catch (e) {
      setMsg(String(e));
    }
  };

  return (
    <div className="grid gap-2 p-3 xl:grid-cols-2">
      <div className="card anim-enter p-3">
        <p className="section-label mb-2">Aprobaciones pendientes ({pending.length})</p>
        {pending.length === 0 && <p className="text-[12px] text-forge-muted">Nada pendiente. Las operaciones sensibles (borrados, sobreescrituras protegidas, Studio, reintentos) llegan aquí.</p>}
        {pending.map((a) => (
          <div key={a.id} className="mb-2 rounded border border-forge-warn/40 bg-forge-warn-soft p-2">
            <p className="text-[13px] font-bold">{a.summary}</p>
            <p className="mono text-[11px] text-forge-muted">tipo: {a.kind}{a.task_id ? ` · tarea: ${a.task_id}` : ''} · {fmtTs(a.created_at)}</p>
            {a.payload && <pre className="mono mt-1 max-h-24 overflow-auto whitespace-pre-wrap rounded bg-forge-bg p-1.5 text-[11px] text-forge-muted">{a.payload.slice(0, 800)}</pre>}
            <div className="mt-1.5 flex gap-1">
              <button onClick={() => decide(a.id, true)} className="btn btn-primary !py-1">Aprobar</button>
              <button onClick={() => decide(a.id, false)} className="btn btn-ghost !py-1 !text-forge-err">Rechazar</button>
            </div>
          </div>
        ))}
        {msg && <p className="mt-1 text-[12px] text-forge-muted">{msg}</p>}
        <p className="section-label mb-1 mt-3">Historial de decisiones ({approvals.filter((a) => a.status !== 'pendiente').length})</p>
        {approvals.filter((a) => a.status !== 'pendiente').slice(-8).reverse().map((a) => (
          <div key={a.id} className="mono mb-1 flex gap-2 text-[11px] text-forge-muted">
            <span className="shrink-0">{fmtTs(a.created_at)}</span>
            <span className="min-w-0 flex-1 truncate">{a.summary}</span>
            <span className={a.status === 'aprobada' ? 'text-forge-ok' : 'text-forge-err'}>{a.status}</span>
          </div>
        ))}
      </div>
      <div className="card anim-enter p-3">
        <p className="section-label mb-2">Revisiones independientes ({reviews.length})</p>
        {reviews.length === 0 && <p className="text-[12px] text-forge-muted">Sin revisiones: otro perfil (QA/seguridad) revisa cada tarea en sesión separada.</p>}
        {reviews.map((m) => (
          <div key={m.id} className="mono mb-1.5 border-b border-forge-border-soft pb-1 text-[11px] text-forge-muted">
            <span className={m.kind === 'REVIEW_APPROVED' ? 'text-forge-ok' : m.kind === 'REVIEW_REJECTED' ? 'text-forge-err' : 'text-forge-accent'}>{m.kind}</span>{' '}
            {m.from} → {m.to}: {m.content.slice(0, 300)}
          </div>
        ))}
        <p className="section-label mb-1 mt-3">Artefactos ({artifacts.length})</p>
        {artifacts.length === 0 && <p className="text-[12px] text-forge-muted">Sin archivos registrados todavía.</p>}
        {artifacts.slice(0, 40).map((a, i) => (
          <div key={i} className="mono mb-0.5 truncate text-[11px] text-forge-muted" title={`${a.rel} · ${a.hash}`}>
            {a.rel} <span className="text-forge-faint">({a.size}B · {a.hash.slice(0, 10)})</span>
          </div>
        ))}
        <p className="section-label mb-1 mt-3">Auditoría ({audit.length})</p>
        {audit.slice(-30).map((a, i) => (
          <div key={i} className="mono mb-0.5 break-words text-[11px] text-forge-muted">
            <span className="text-forge-faint">{fmtTs(a.created_at)}</span> {a.actor} · {a.action}{a.permission ? ` [${a.permission}]` : ''} → {a.result.slice(0, 160)}
          </div>
        ))}
      </div>
    </div>
  );
}
