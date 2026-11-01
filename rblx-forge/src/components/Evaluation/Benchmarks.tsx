// Catálogo de benchmarks: criterios, checks y lanzamiento real a la cola.
import { useMemo, useState } from 'react';
import { useEval } from '../../stores/eval';
import { GROUP_LABELS } from '../../lib/eval/types';

export function Benchmarks() {
  const benches = useEval((s) => s.benchmarks);
  const skills = useEval((s) => s.skills);
  const queueBenchmark = useEval((s) => s.queueBenchmark);
  const [cat, setCat] = useState('todas');
  const [sel, setSel] = useState<string | null>(null);
  const [skillText, setSkillText] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const cats = useMemo(() => [...new Set(benches.map((b) => b.category))].sort(), [benches]);
  const list = benches.filter((b) => cat === 'todas' || b.category === cat);
  const current = benches.find((b) => b.id === sel) ?? null;

  const launch = async () => {
    if (!current) return;
    setMsg(null);
    const ids = skillText.split(',').map((s) => s.trim()).filter(Boolean);
    const use = ids.length ? ids : current.expected_skills;
    // Validar que existen en el registro (nada inventado).
    const known = new Set(skills.map((s) => s.id));
    const unknown = use.filter((id) => !known.has(id));
    if (unknown.length) {
      setMsg(`Skills no registradas (no se lanza): ${unknown.join(', ')}`);
      return;
    }
    try {
      const id = await queueBenchmark(current.id, use);
      setMsg(`Encolada: ${id} (${use.join('+') || 'sin skills'}). Sigue el progreso en Runs.`);
    } catch (e) {
      setMsg(String(e));
    }
  };

  if (!benches.length) {
    return (
      <div className="mx-auto max-w-md p-6 text-center">
        <div className="card anim-enter p-5">
          <p className="font-bold">Sin benchmarks</p>
          <p className="mt-1 text-[12px] text-forge-muted">La semilla de 30 benchmarks se crea al inicializar la base. Pulsa «Actualizar» arriba.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-3 lg:flex-row lg:gap-3">
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex items-center gap-1 text-[12px]">
          <select value={cat} onChange={(e) => setCat(e.target.value)} className="rounded border border-forge-border bg-forge-bg px-2 py-1">
            <option value="todas">Todas ({benches.length})</option>
            {cats.map((c) => <option key={c} value={c}>{GROUP_LABELS[c] ?? c}</option>)}
          </select>
          <span className="mono ml-auto text-[11px] text-forge-faint">{list.length} benchmarks</span>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          {list.map((b) => (
            <button key={b.id} onClick={() => { setSel(b.id); setSkillText(''); setMsg(null); }} className={`card card-hover anim-enter p-2 text-left ${sel === b.id ? 'border-forge-accent' : ''}`}>
              <p className="text-[13px] font-bold">{b.name}</p>
              <p className="mono text-[10px] text-forge-faint">{b.id} · {b.category} · {b.difficulty}</p>
              <p className="mt-1 line-clamp-2 text-[12px] text-forge-muted">{b.description}</p>
              <p className="mono mt-1 text-[10px] text-forge-muted">skills: {b.expected_skills.join(', ')}</p>
            </button>
          ))}
        </div>
      </div>
      <div className="mt-2 w-full shrink-0 lg:mt-0 lg:w-96">
        {!current && <p className="card p-3 text-[12px] text-forge-muted">Selecciona un benchmark para ver criterios y lanzarlo.</p>}
        {current && (
          <div className="card anim-enter p-3">
            <p className="font-bold">{current.name}</p>
            <p className="mono mb-1 text-[10px] text-forge-faint">{current.id} · {current.difficulty}</p>
            <p className="mb-1 text-[12px]"><span className="font-bold">Objetivo:</span> {current.objective}</p>
            <p className="section-label mt-2 mb-1">Criterios (peso)</p>
            {current.criteria.map((c) => (
              <div key={c.id} className="flex text-[11px] text-forge-muted"><span className={`mono mr-1 ${c.kind === 'auto' ? 'text-forge-ok' : 'text-forge-info'}`}>[{c.kind}]</span><span className="min-w-0 flex-1">{c.label}</span><span className="mono">{Math.round(c.weight * 100)}%</span></div>
            ))}
            <p className="section-label mt-2 mb-1">Checks automáticos</p>
            {current.auto_checks.map((c, i) => (
              <div key={i} className="mono text-[11px] text-forge-muted">{c.kind}({c.param}) · {Math.round(c.weight * 100)}%</div>
            ))}
            <p className="section-label mt-2 mb-1">Skills a evaluar (IDs del registro)</p>
            <input value={skillText} onChange={(e) => setSkillText(e.target.value)} placeholder={current.expected_skills.join(', ')} className="input mono w-full !text-[11px]" title="Vacío = usar las esperadas del benchmark" />
            <button onClick={launch} className="btn btn-primary mt-2 w-full justify-center">Lanzar benchmark (OpenCode real)</button>
            {msg && <p className="mt-2 text-[12px] text-forge-muted">{msg}</p>}
            <p className="mt-2 text-[11px] text-forge-faint">Aislamiento: sesión en workspace + escritura confinada al tmpdir + denegación fuera de él + verificación de que las skills no cambian. Timeout y cancelación disponibles en Runs.</p>
          </div>
        )}
      </div>
    </div>
  );
}
