// Resumen: cifras reales de eval.db + gráficos SVG propios (sin datos → vacío).
import { useEval } from '../../stores/eval';
import { VERDICT_LABELS, groupLabel } from '../../lib/eval/types';

function Bar({ label, value, max, tone }: { label: string; value: number; max: number; tone: string }) {
  return (
    <div className="mb-1 flex items-center gap-2 text-[11px]">
      <span className="w-44 truncate text-forge-muted" title={label}>{label}</span>
      <div className="h-2 min-w-0 flex-1 rounded bg-forge-panel3">
        <div className="h-2 rounded" style={{ width: `${max ? Math.round((value / max) * 100) : 0}%`, background: tone }} />
      </div>
      <span className="mono w-10 text-right">{value}</span>
    </div>
  );
}

export function Overview() {
  const d = useEval((s) => s.dashboard);
  const skills = useEval((s) => s.skills);
  const grpPairs = useEval((s) => s.groups);
  if (!d) {
    return (
      <div className="mx-auto max-w-md p-6 text-center">
        <div className="card anim-enter p-5">
          <p className="font-bold">Sin datos todavía</p>
          <p className="mt-1 text-[12px] text-forge-muted">Pulsa «Re-escanear» para descubrir las skills del workspace y poblar el registro. Nada se evalúa solo.</p>
        </div>
      </div>
    );
  }
  const groups = Object.entries(d.by_group).sort((a, b) => b[1] - a[1]);
  const maxG = groups.length ? groups[0][1] : 0;
  const verdicts = Object.entries(d.by_verdict);
  const maxV = verdicts.length ? Math.max(...verdicts.map(([, n]) => n)) : 0;
  const scored = useEval.getState().runs.filter((r) => r.status === 'completada' && typeof r.score === 'number')
    .sort((a, b) => a.created_at - b.created_at).slice(-20);
  const analyzedPct = d.total_skills ? Math.round((d.analyzed_skills / d.total_skills) * 100) : 0;

  return (
    <div className="grid gap-2 p-3 xl:grid-cols-2">
      <div className="card anim-enter p-3">
        <p className="section-label mb-2">Estado de la biblioteca</p>
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            [String(d.total_skills), 'skills'],
            [String(d.analyzed_skills), 'analizadas'],
            [String(d.pending_skills), 'pendientes'],
            [String(d.critical), 'críticos'],
          ].map(([n, l]) => (
            <div key={l} className="rounded border border-forge-border-soft p-2">
              <div className="text-xl font-extrabold text-forge-accent">{n}</div>
              <div className="text-[11px] text-forge-muted">{l}</div>
            </div>
          ))}
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded bg-forge-panel3" title={`Cobertura de análisis: ${analyzedPct}%`}>
          <div className="h-2 bg-forge-ok" style={{ width: `${analyzedPct}%` }} />
        </div>
        <p className="mono mt-1 text-[10px] text-forge-faint">análisis estático: {analyzedPct}% · benchmarks: {d.benchmarks} · runs: {d.runs} ({d.runs_completed} completadas)</p>
      </div>

      <div className="card anim-enter p-3">
        <p className="section-label mb-2">Puntuación y veredictos</p>
        {d.avg_score === null ? (
          <p className="rounded border border-forge-border-soft p-2 text-[12px] text-forge-muted">
            Sin media: se requieren ≥3 runs puntuadas (actual: {d.scored_runs}). Los gráficos no estiman nada.
          </p>
        ) : (
          <p className="mb-2 text-[12px]">Media real: <span className="mono font-bold text-forge-accent">{d.avg_score.toFixed(1)}</span> <span className="text-forge-muted">sobre {d.scored_runs} runs</span></p>
        )}
        {verdicts.length === 0 && <p className="text-[12px] text-forge-muted">Sin veredictos: lanza un benchmark en la pestaña Benchmarks.</p>}
        {verdicts.map(([v, n]) => (
          <Bar key={v} label={VERDICT_LABELS[v] ?? v} value={n} max={maxV} tone={v === 'FAILED' || v === 'BLOCKED' ? 'var(--color-forge-err)' : v === 'PASSED' ? 'var(--color-forge-ok)' : 'var(--color-forge-accent)'} />
        ))}
      </div>

      <div className="card anim-enter p-3">
        <p className="section-label mb-2">Skills por grupo (registro real)</p>
        {groups.length === 0 && <p className="text-[12px] text-forge-muted">Sin skills registradas.</p>}
        {groups.map(([g, n]) => (
          <Bar key={g} label={groupLabel(grpPairs, g)} value={n} max={maxG} tone="var(--color-forge-info)" />
        ))}
        {skills.length > 0 && <p className="mono mt-1 text-[10px] text-forge-faint">total listado: {skills.length}</p>}
      </div>

      <div className="card anim-enter p-3">
        <p className="section-label mb-2">Últimas ejecuciones</p>
        {d.recent.length === 0 && <p className="text-[12px] text-forge-muted">Sin runs. Cada ejecución usa OpenCode real en un tmpdir aislado.</p>}
        {d.recent.map((r) => (
          <div key={r.id} className="mono mb-1 flex gap-2 text-[11px] text-forge-muted">
            <span className="shrink-0">{new Date(r.created_at * 1000).toLocaleString()}</span>
            <span className="min-w-0 flex-1 truncate">{r.benchmark_id} · {r.skill_ids.join('+') || '—'}</span>
            <span className={r.status === 'completada' ? 'text-forge-ok' : r.status === 'fallida' || r.status === 'cumplido-timeout' ? 'text-forge-err' : 'text-forge-warn'}>{r.status}{typeof r.score === 'number' ? ` · ${r.score}` : ''}</span>
          </div>
        ))}
        {scored.length >= 2 && (
          <div className="mt-2">
            <p className="section-label mb-1">Evolución de score (últimas {scored.length} puntuadas)</p>
            <svg viewBox={`0 0 ${scored.length * 24 + 8} 60`} className="h-16 w-full rounded bg-forge-bg">
              <line x1="0" y1="55" x2={scored.length * 24 + 8} y2="55" stroke="#2c3a52" />
              {scored.map((r, i) => {
                const h = Math.max(2, ((r.score ?? 0) / 100) * 50);
                return <rect key={r.id} x={4 + i * 24} y={55 - h} width="14" height={h} rx="2" fill="var(--color-forge-accent)"><title>{`${r.benchmark_id}: ${r.score}`}</title></rect>;
              })}
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
