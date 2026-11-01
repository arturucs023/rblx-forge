// Comparación: run vs run (regresión) y snapshots de una skill.
import { useState } from 'react';
import { useEval } from '../../stores/eval';

interface Cmp {
  a: Record<string, unknown>;
  b: Record<string, unknown>;
  score_delta: number | null;
  regression: boolean;
  notes: string[];
}

export function Compare() {
  const runs = useEval((s) => s.runs);
  const skills = useEval((s) => s.skills);
  const compareRuns = useEval((s) => s.compareRuns);
  const history = useEval((s) => s.history);
  const [ra, setRa] = useState('');
  const [rb, setRb] = useState('');
  const [cmp, setCmp] = useState<Cmp | null>(null);
  const [skillId, setSkillId] = useState('');
  const [hist, setHist] = useState<{ snapshots: Array<{ hash: string; created_at: number; findings?: number; critical?: number }>; regression_notes: string[] } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const doCmp = async () => {
    setMsg(null);
    setCmp(null);
    if (!ra || !rb) {
      setMsg('Selecciona dos runs.');
      return;
    }
    try {
      setCmp((await compareRuns(ra, rb)) as Cmp);
    } catch (e) {
      setMsg(String(e));
    }
  };
  const doHist = async () => {
    setMsg(null);
    setHist(null);
    if (!skillId) {
      setMsg('Elige una skill.');
      return;
    }
    try {
      setHist((await history(skillId)) as typeof hist);
    } catch (e) {
      setMsg(String(e));
    }
  };

  return (
    <div className="grid gap-2 p-3 xl:grid-cols-2">
      <div className="card anim-enter p-3">
        <p className="section-label mb-2">Comparar dos runs</p>
        <div className="mb-2 flex gap-1 text-[12px]">
          <select value={ra} onChange={(e) => setRa(e.target.value)} className="min-w-0 flex-1 rounded border border-forge-border bg-forge-bg px-2 py-1">
            <option value="">Run A…</option>
            {runs.map((r) => <option key={r.id} value={r.id}>{r.id} · {r.benchmark_id} · {r.score ?? '—'}</option>)}
          </select>
          <select value={rb} onChange={(e) => setRb(e.target.value)} className="min-w-0 flex-1 rounded border border-forge-border bg-forge-bg px-2 py-1">
            <option value="">Run B…</option>
            {runs.map((r) => <option key={r.id} value={r.id}>{r.id} · {r.benchmark_id} · {r.score ?? '—'}</option>)}
          </select>
          <button onClick={doCmp} className="btn btn-primary">Comparar</button>
        </div>
        {runs.length < 2 && <p className="text-[12px] text-forge-muted">Se necesitan ≥2 runs. Lanza benchmarks primero; no se compara con datos inventados.</p>}
        {msg && <p className="text-[12px] text-forge-muted">{msg}</p>}
        {cmp && (
          <div className="text-[12px]">
            <p className={`font-bold ${cmp.regression ? 'text-forge-err' : 'text-forge-ok'}`}>
              {cmp.regression ? 'REGRESIÓN detectada' : 'Sin regresión'} · Δ score: {cmp.score_delta === null ? 'no calculable (falta score)' : cmp.score_delta.toFixed(1)}
            </p>
            {cmp.notes.map((n, i) => <p key={i} className="text-forge-muted">· {n}</p>)}
            <div className="mono mt-2 grid grid-cols-2 gap-2 text-[11px] text-forge-muted">
              <div>A: {String(cmp.a['benchmark_id'])} · score {String(cmp.a['score'] ?? '—')} · modelo {String(cmp.a['model'] ?? '—')}</div>
              <div>B: {String(cmp.b['benchmark_id'])} · score {String(cmp.b['score'] ?? '—')} · modelo {String(cmp.b['model'] ?? '—')}</div>
            </div>
            <p className="mt-1 text-[11px] text-forge-faint">Si cambian modelo, versión de OpenCode o benchmark, la comparación se marca como no equivalente.</p>
          </div>
        )}
      </div>
      <div className="card anim-enter p-3">
        <p className="section-label mb-2">Regresión de una skill (snapshots)</p>
        <div className="mb-2 flex gap-1 text-[12px]">
          <select value={skillId} onChange={(e) => setSkillId(e.target.value)} className="min-w-0 flex-1 rounded border border-forge-border bg-forge-bg px-2 py-1">
            <option value="">Skill…</option>
            {skills.map((s) => <option key={s.id} value={s.id}>{s.id}</option>)}
          </select>
          <button onClick={doHist} className="btn btn-primary">Ver historial</button>
        </div>
        {!hist && <p className="text-[12px] text-forge-muted">Cada análisis guarda un snapshot sin sobrescribir el anterior.</p>}
        {hist && (
          <div className="text-[12px]">
            {hist.snapshots.map((x, i) => (
              <div key={i} className="mono text-[11px] text-forge-muted">{new Date(x.created_at * 1000).toLocaleString()} · {x.hash.slice(0, 10)} · {x.findings} hallazgos · {x.critical} críticos</div>
            ))}
            {hist.regression_notes.map((n, i) => (
              <p key={i} className={n.includes('REGRESIÓN') ? 'text-forge-err' : 'text-forge-ok'}>{n}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
