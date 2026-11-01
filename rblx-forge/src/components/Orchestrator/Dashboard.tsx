// Panel principal: crear ejecución, estado, agentes, colas, aprobaciones.
import { useEffect, useState } from 'react';
import { useOrch } from '../../stores/orch';
import { getProjectsParent } from '../../lib/paths';
import { Empty, StateBadge, fmtTs } from './common';

export function Dashboard({ go }: { go: (t: 'panel' | 'agentes' | 'tareas' | 'ejecucion' | 'plan' | 'revision' | 'historial') => void }) {
  const dashboard = useOrch((s) => s.dashboard);
  const runs = useOrch((s) => s.runs);
  const profiles = useOrch((s) => s.profiles);
  const activeRunId = useOrch((s) => s.activeRunId);
  const createRun = useOrch((s) => s.createRun);
  const selectRun = useOrch((s) => s.selectRun);
  const [goal, setGoal] = useState('');
  const [projectDir, setProjectDir] = useState('');
  const [scope, setScope] = useState<'project' | 'tmp'>('project');
  const [msg, setMsg] = useState<string | null>(null);

  // La carpeta de juegos ya se elige en Configuración: se reutiliza aquí.
  useEffect(() => {
    getProjectsParent().then((p) => { if (p) setProjectDir(p); }).catch(() => {});
  }, []);

  const create = async () => {
    setMsg(null);
    if (!projectDir.trim() && scope === 'project') {
      setMsg('Sin carpeta de juegos: configúrala en Configuración o usa ámbito tmp aislado.');
      return;
    }
    try {
      const id = await createRun(goal.trim(), projectDir.trim(), scope);
      setGoal('');
      setMsg(`Ejecución creada: ${id}. Genera el plan en la pestaña Plan.`);
      go('plan');
    } catch (e) {
      setMsg(String(e));
    }
  };

  return (
    <div className="grid gap-2 p-3 xl:grid-cols-2">
      {runs.length === 0 && (
        <div className="card anim-enter p-3 xl:col-span-2">
          <p className="section-label mb-2">Cómo funciona (4 pasos)</p>
          <div className="grid gap-2 md:grid-cols-4">
            {[
              ['1', 'Describe el objetivo', 'Arriba: qué quieres construir, con el máximo detalle.'],
              ['2', 'Genera el plan', 'El coordinador (IA real) propone tareas, agentes y skills en Plan.'],
              ['3', 'Aprueba', 'Revisa el DAG, corrige y pulsa «Aprobar y ejecutar».'],
              ['4', 'Supervisa', 'Mira la Ejecución en vivo y decide aprobaciones en Revisión.'],
            ].map(([n, t, h]) => (
              <div key={n} className="rounded border border-forge-border-soft p-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-forge-accent-soft text-[11px] font-bold text-forge-accent">{n}</span>
                <p className="mt-1 text-[12px] font-bold">{t}</p>
                <p className="text-[11px] text-forge-muted">{h}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-forge-faint">Sin modelo que responda no hay plan: comprueba la cuota con <span className="mono">node rblx-forge/scripts/probe-quota.cjs</span>. Sin IA, monta el plan a mano en Tareas (la validación es local).</p>
        </div>
      )}
      <div className="card anim-enter p-3">
        <p className="section-label mb-2">Nueva ejecución</p>
        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="Describe la funcionalidad compleja (p. ej. sistema de misiones con NPC, interfaz, recompensas y persistencia)"
          className="input min-h-20 w-full"
        />
        <div className="mt-1 flex flex-wrap gap-1 text-[12px]">
          <input
            value={projectDir}
            onChange={(e) => setProjectDir(e.target.value)}
            placeholder="Carpeta de juegos (viene de Configuración)"
            title="Carpeta de juegos configurada — puedes ajustarla para este run"
            className="input mono min-w-0 flex-1 !text-[11px]"
          />
          <select value={scope} onChange={(e) => setScope(e.target.value as 'project' | 'tmp')} className="rounded border border-forge-border bg-forge-bg px-2 py-1" title="Ámbito de escritura">
            <option value="project">Ámbito: proyecto</option>
            <option value="tmp">Ámbito: tmp aislado</option>
          </select>
          <button onClick={create} disabled={!goal.trim()} className="btn btn-primary">Crear ejecución</button>
        </div>
        {msg && <p className="mt-1 text-[12px] text-forge-muted">{msg}</p>}
        <p className="mt-1 text-[11px] text-forge-faint">El plan lo genera el coordinador (IA real) o lo montas a mano en Tareas. Nada se ejecuta sin tu aprobación del plan.</p>
      </div>

      <div className="card anim-enter p-3">
        <p className="section-label mb-2">Estado del sistema</p>
        {!dashboard ? (
          <p className="text-[12px] text-forge-muted">Sin datos.</p>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                [String(dashboard.profiles), 'agentes'],
                [String(dashboard.runs), 'runs'],
                [String(dashboard.pending_approvals), 'aprob. pend.'],
                [String(dashboard.blocked_tasks), 'bloqueadas'],
              ].map(([n, l]) => (
                <div key={l} className="rounded border border-forge-border-soft p-2">
                  <div className="text-xl font-extrabold text-forge-accent">{n}</div>
                  <div className="text-[11px] text-forge-muted">{l}</div>
                </div>
              ))}
            </div>
            {dashboard.pending_approvals > 0 && (
              <button onClick={() => go('revision')} className="btn btn-ghost mt-2">
                Hay {dashboard.pending_approvals} aprobaciones pendientes → Revisión
              </button>
            )}
            <div className="mt-2">
              <p className="section-label mb-1">Actividad reciente</p>
              {dashboard.recent.length === 0 && <p className="text-[12px] text-forge-muted">Sin ejecuciones.</p>}
              {dashboard.recent.map((r) => (
                <button key={r.id} onClick={() => { selectRun(r.id); go('plan'); }} className="mono mb-1 flex w-full gap-2 text-left text-[11px] text-forge-muted hover:text-forge-text">
                  <span className="shrink-0">{fmtTs(r.created_at)}</span>
                  <span className="min-w-0 flex-1 truncate">{r.goal}</span>
                  <StateBadge state={r.status} />
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="card anim-enter p-3">
        <p className="section-label mb-2">Agentes ({profiles.filter((p) => p.active).length}/{profiles.length} activos)</p>
        <div className="flex flex-wrap gap-1">
          {profiles.map((p) => (
            <button key={p.id} onClick={() => go('agentes')} title={`${p.specialty}: ${p.description}`} className={`rounded border px-2 py-1 text-[12px] ${p.active ? 'border-forge-border hover:border-forge-accent-dim' : 'border-forge-border-soft text-forge-faint line-through'}`}>
              {p.name}
            </button>
          ))}
        </div>
        {profiles.length === 0 && <p className="text-[12px] text-forge-muted">Sin perfiles (deberían existir 10 integrados).</p>}
      </div>

      <div className="card anim-enter p-3">
        <p className="section-label mb-2">Ejecuciones ({runs.length})</p>
        {runs.length === 0 && <Empty title="Sin ejecuciones" hint="Crea la primera arriba: describe el objetivo y el coordinador propondrá el plan." />}
        {runs.slice(0, 8).map((r) => (
          <button key={r.id} onClick={() => { selectRun(r.id); }} className={`mono mb-1 flex w-full gap-2 rounded border px-2 py-1 text-left text-[11px] ${r.id === activeRunId ? 'border-forge-accent-dim bg-forge-accent-soft' : 'border-forge-border-soft text-forge-muted hover:text-forge-text'}`}>
            <span className="min-w-0 flex-1 truncate">{r.goal}</span>
            <StateBadge state={r.status} />
          </button>
        ))}
        {activeRunId && (
          <div className="mt-2 flex gap-1 text-[12px]">
            <button onClick={() => go('tareas')} className="btn btn-ghost">Tareas →</button>
            <button onClick={() => go('ejecucion')} className="btn btn-ghost">Ejecución →</button>
            <button onClick={() => go('plan')} className="btn btn-ghost">Plan →</button>
          </div>
        )}
      </div>
    </div>
  );
}
