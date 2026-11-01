// Historial persistente de ejecuciones: filtros, reapertura e informes.
import { useState } from 'react';
import { useOrch } from '../../stores/orch';
import { Empty, StateBadge, fmtTs } from './common';

export function History() {
  const runs = useOrch((s) => s.runs);
  const selectRun = useOrch((s) => s.selectRun);
  const deleteRun = useOrch((s) => s.deleteRun);
  const exportReport = useOrch((s) => s.exportReport);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('todos');
  const [content, setContent] = useState<string | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const list = runs.filter(
    (r) =>
      (!q.trim() || r.goal.toLowerCase().includes(q.toLowerCase())) &&
      (status === 'todos' || r.status === status),
  );

  const download = (runId: string, format: string) => {
    setMsg(null);
    setContent(null);
    exportReport(runId, format)
      .then((r) => {
        setContent(r.content);
        setFilename(r.filename);
      })
      .catch((e) => setMsg(String(e)));
  };

  const save = () => {
    if (!content || !filename) return;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  };

  if (!runs.length) {
    return <Empty title="Sin historial" hint="Las ejecuciones quedan guardadas en SQLite y sobreviven al reinicio." />;
  }

  return (
    <div className="mx-auto max-w-4xl p-3">
      <div className="mb-2 flex gap-1 text-[12px]">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por objetivo…" className="input min-w-0 flex-1" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded border border-forge-border bg-forge-bg px-2 py-1">
          <option value="todos">Todos los estados</option>
          <option value="borrador">Borrador</option>
          <option value="en_ejecucion">En ejecución</option>
          <option value="pausado">Pausado</option>
          <option value="completada">Completada</option>
          <option value="fallida">Fallida</option>
          <option value="cancelada">Cancelada</option>
        </select>
      </div>
      {list.map((r) => (
        <div key={r.id} className="card mb-1.5 flex items-center gap-2 p-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-bold">{r.goal}</p>
            <p className="mono truncate text-[10px] text-forge-faint">{r.id} · {fmtTs(r.created_at)} · {r.project_dir || 'sin proyecto'}</p>
          </div>
          <StateBadge state={r.status} />
          <button onClick={() => selectRun(r.id)} className="btn btn-ghost !px-2 !py-0.5">Abrir</button>
          <button onClick={() => download(r.id, 'md')} className="btn btn-ghost !px-2 !py-0.5">MD</button>
          <button onClick={() => download(r.id, 'json')} className="btn btn-ghost !px-2 !py-0.5">JSON</button>
          <button
            onClick={() => {
              if (window.confirm(`Borrar la ejecución «${r.goal.slice(0, 60)}» y todos sus datos (tareas, mensajes, auditoría)?`)) {
                deleteRun(r.id).catch((e) => setMsg(String(e)));
              }
            }}
            className="btn btn-ghost !px-2 !py-0.5 !text-forge-err"
            title="Borrar ejecución y sus datos"
          >
            Borrar
          </button>
        </div>
      ))}
      {msg && <p className="text-[12px] text-forge-err">{msg}</p>}
      {content && (
        <div className="card mt-2 p-2">
          <div className="mb-1 flex items-center gap-2">
            <p className="mono text-[11px] text-forge-muted">{filename}</p>
            <button onClick={save} className="btn btn-primary ml-auto !py-0.5">Descargar</button>
          </div>
          <pre className="mono max-h-80 overflow-auto whitespace-pre-wrap text-[11px] text-forge-muted">{content.slice(0, 12000)}</pre>
        </div>
      )}
    </div>
  );
}
