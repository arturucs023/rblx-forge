// Lista de skills: búsqueda, filtros reales, ordenación. Sin datos → vacío.
import { useMemo, useState } from 'react';
import { useEval } from '../../stores/eval';
import { GROUP_LABELS } from '../../lib/eval/types';

type SortKey = 'id' | 'score' | 'runs';

export function Skills({ onOpenSkill }: { onOpenSkill: () => void }) {
  const skills = useEval((s) => s.skills);
  const q = useEval((s) => s.q);
  const grp = useEval((s) => s.grp);
  const origin = useEval((s) => s.origin);
  const status = useEval((s) => s.status);
  const setFilter = useEval((s) => s.setFilter);
  const openSkill = useEval((s) => s.openSkill);
  const busy = useEval((s) => s.busy);
  const [sort, setSort] = useState<SortKey>('id');
  const [sel, setSel] = useState<string | null>(null);

  const groups = useMemo(() => [...new Set(skills.map((s) => s.grp))].sort(), [skills]);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let v = skills.filter((s) =>
      (!needle || s.id.toLowerCase().includes(needle) || s.name.toLowerCase().includes(needle) || s.description.toLowerCase().includes(needle)) &&
      (grp === 'todos' || s.grp === grp) &&
      (origin === 'todos' || s.origin === origin) &&
      (status === 'todos' || s.status === status),
    );
    v = [...v].sort((a, b) => {
      if (sort === 'score') return (b.last_score ?? -1) - (a.last_score ?? -1);
      if (sort === 'runs') return b.runs_count - a.runs_count;
      return a.id.localeCompare(b.id);
    });
    return v;
  }, [skills, q, grp, origin, status, sort]);

  if (!skills.length && !busy) {
    return (
      <div className="mx-auto max-w-md p-6 text-center">
        <div className="card anim-enter p-5">
          <p className="font-bold">Registro vacío</p>
          <p className="mt-1 text-[12px] text-forge-muted">Pulsa «Re-escanear» arriba para descubrir las 148 skills del workspace. Si el workspace no está configurado, hazlo en Configuración.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-3">
      <div className="mb-2 flex flex-wrap items-center gap-1 text-[12px]">
        <input value={q} onChange={(e) => setFilter({ q: e.target.value })} placeholder="Buscar skill…" className="input min-w-40 flex-1 !text-[12px]" />
        <select value={grp} onChange={(e) => setFilter({ grp: e.target.value })} className="rounded border border-forge-border bg-forge-bg px-2 py-1">
          <option value="todos">Todos los grupos ({skills.length})</option>
          {groups.map((g) => <option key={g} value={g}>{GROUP_LABELS[g] ?? g}</option>)}
        </select>
        <select value={origin} onChange={(e) => setFilter({ origin: e.target.value })} className="rounded border border-forge-border bg-forge-bg px-2 py-1">
          <option value="todos">Cualquier origen</option>
          <option value="instalada">Instalada</option>
          <option value="propia">Propia</option>
        </select>
        <select value={status} onChange={(e) => setFilter({ status: e.target.value })} className="rounded border border-forge-border bg-forge-bg px-2 py-1">
          <option value="todos">Cualquier estado</option>
          <option value="activa">Activa</option>
          <option value="nueva">Nueva</option>
          <option value="modificada">Modificada</option>
          <option value="eliminada">Eliminada</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="rounded border border-forge-border bg-forge-bg px-2 py-1" title="Ordenar">
          <option value="id">Orden: ID</option>
          <option value="score">Orden: score</option>
          <option value="runs">Orden: runs</option>
        </select>
        <span className="mono ml-auto text-[11px] text-forge-faint">{list.length}/{skills.length}</span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto rounded border border-forge-border">
        <table className="w-full text-[12px]">
          <thead className="sticky top-0 bg-forge-panel3 text-left text-forge-muted">
            <tr>
              <th className="px-2 py-1 font-semibold">ID</th>
              <th className="px-2 py-1 font-semibold">Grupo</th>
              <th className="px-2 py-1 font-semibold">Origen</th>
              <th className="px-2 py-1 font-semibold">Estado</th>
              <th className="px-2 py-1 text-right font-semibold">Score</th>
              <th className="px-2 py-1 text-right font-semibold">Runs</th>
            </tr>
          </thead>
          <tbody>
            {list.map((s) => (
              <tr
                key={s.id}
                onClick={() => { setSel(s.id); openSkill(s.id).then(() => onOpenSkill()).catch(() => {}); }}
                className={`cursor-pointer border-t border-forge-border-soft hover:bg-forge-panel2 ${sel === s.id ? 'bg-forge-panel2' : ''}`}
              >
                <td className="px-2 py-1"><span className="mono text-forge-accent">{s.id}</span><div className="max-w-md truncate text-[11px] text-forge-muted">{s.name}</div></td>
                <td className="px-2 py-1 text-forge-muted">{GROUP_LABELS[s.grp] ?? s.grp}</td>
                <td className="px-2 py-1 text-forge-muted">{s.origin}</td>
                <td className="px-2 py-1"><span className={s.status === 'eliminada' ? 'text-forge-err' : s.status === 'activa' ? 'text-forge-ok' : 'text-forge-warn'}>{s.status}</span></td>
                <td className="mono px-2 py-1 text-right">{typeof s.last_score === 'number' ? s.last_score.toFixed(1) : '—'}</td>
                <td className="mono px-2 py-1 text-right">{s.runs_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && <p className="p-3 text-[12px] text-forge-muted">Sin resultados para esos filtros.</p>}
      </div>
    </div>
  );
}
