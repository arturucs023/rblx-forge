// Informes: general, por skill y por run. Exportación JSON/CSV/Markdown real.
import { useState } from 'react';
import { useEval } from '../../stores/eval';

export function Reports() {
  const skills = useEval((s) => s.skills);
  const runs = useEval((s) => s.runs);
  const exportReport = useEval((s) => s.exportReport);
  const [kind, setKind] = useState('general');
  const [format, setFormat] = useState('md');
  const [content, setContent] = useState<string | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const gen = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await exportReport(kind, format);
      setContent(r.content);
      setFilename(r.filename);
    } catch (e) {
      setMsg(String(e));
    } finally {
      setBusy(false);
    }
  };
  const download = () => {
    if (!content || !filename) return;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  };

  return (
    <div className="mx-auto max-w-3xl p-3">
      <div className="card anim-enter p-3">
        <p className="section-label mb-2">Generar informe (datos reales de eval.db)</p>
        <div className="mb-2 flex flex-wrap gap-1 text-[12px]">
          <select value={kind} onChange={(e) => setKind(e.target.value)} className="rounded border border-forge-border bg-forge-bg px-2 py-1">
            <option value="general">General</option>
            <optgroup label="Por skill">
              {skills.map((s) => <option key={s.id} value={`skill:${s.id}`}>{s.id}</option>)}
            </optgroup>
            <optgroup label="Por run">
              {runs.map((r) => <option key={r.id} value={`run:${r.id}`}>{r.id}</option>)}
            </optgroup>
          </select>
          <select value={format} onChange={(e) => setFormat(e.target.value)} className="rounded border border-forge-border bg-forge-bg px-2 py-1">
            <option value="md">Markdown</option>
            <option value="json">JSON</option>
            <option value="csv">CSV</option>
          </select>
          <button onClick={gen} disabled={busy} className="btn btn-primary">{busy ? 'Generando…' : 'Generar'}</button>
          {content && <button onClick={download} className="btn btn-ghost">Descargar {filename}</button>}
        </div>
        {msg && <p className="text-[12px] text-forge-err">{msg}</p>}
        {!content && <p className="text-[12px] text-forge-muted">El informe refleja el estado real: skills sin evaluar aparecen como pendientes, nunca con scores inventados.</p>}
        {content && <pre className="mono max-h-96 overflow-auto whitespace-pre-wrap rounded border border-forge-border-soft bg-forge-bg p-2 text-[11px] text-forge-muted">{content.slice(0, 12000)}</pre>}
      </div>
    </div>
  );
}
