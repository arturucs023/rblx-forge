import { useMemo } from 'react';
import { diffLines, diffStats, DIFF_LINE_LIMIT } from '../lib/diff';

// Comparación honesta línea a línea. No es análisis semántico: dos
// refactors idénticos en distinto orden aparecen como cambios.
export function DiffViewer({ original, modified, title }: { original: string; modified: string; title?: string }) {
  const result = useMemo(() => diffLines(original, modified), [original, modified]);
  if (result === null) {
    return <p className="p-3 text-forge-warn">Archivos demasiado grandes (límite {DIFF_LINE_LIMIT} líneas) para el diff local.</p>;
  }
  const s = diffStats(result);
  return (
    <div className="flex h-full flex-col">
      <div className="mono flex gap-3 border-b border-forge-border px-2 py-1 text-[11px]">
        {title && <span className="font-bold">{title}</span>}
        <span className="text-forge-ok">+{s.add}</span>
        <span className="text-forge-err">-{s.del}</span>
        <span className="text-forge-muted">{s.same} iguales</span>
        <span className="ml-auto text-forge-muted">diff textual, no semántico</span>
      </div>
      <pre className="mono min-h-0 flex-1 overflow-auto p-2 text-[12px]">
        {result.map((l, i) => (
          <div key={i} className={l.type === '+' ? 'bg-forge-ok/10 text-forge-ok' : l.type === '-' ? 'bg-forge-err/10 text-forge-err' : 'text-forge-muted'}>
            <span className="mr-2 inline-block w-3 select-none">{l.type}</span>
            {l.text || ' '}
          </div>
        ))}
      </pre>
    </div>
  );
}
