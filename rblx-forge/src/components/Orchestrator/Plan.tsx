// Plan: validación del DAG, niveles de ejecución, envío a aprobación y control.
import { useEffect, useState } from 'react';
import { useOrch } from '../../stores/orch';
import { AgentGlyph, Empty, StateBadge } from './common';
import { ModelPicker, type ModelValue } from '../ModelPicker';
import type { OrchTask } from '../../lib/orch/types';

function levels(tasks: OrchTask[]): OrchTask[][] {
  // Niveles por profundidad de dependencias (visual, no ejecuta nada).
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const depth = new Map<string, number>();
  const visit = (id: string, seen: string[]): number => {
    if (depth.has(id)) return depth.get(id)!;
    if (seen.includes(id)) return 0;
    const t = byId.get(id);
    if (!t || !t.depends_on.length) {
      depth.set(id, 0);
      return 0;
    }
    const d = 1 + Math.max(...t.depends_on.map((x) => visit(x, [...seen, id])));
    depth.set(id, d);
    return d;
  };
  tasks.forEach((t) => visit(t.id, []));
  const max = Math.max(0, ...[...depth.values()]);
  return Array.from({ length: max + 1 }, (_, l) => tasks.filter((t) => (depth.get(t.id) ?? 0) === l));
}

export function Plan() {
  const runDetail = useOrch((s) => s.runDetail);
  const tasks = useOrch((s) => s.tasks);
  const issues = useOrch((s) => s.issues);
  const busy = useOrch((s) => s.busy);
  const submitPlan = useOrch((s) => s.submitPlan);
  const approvePlan = useOrch((s) => s.approvePlan);
  const pauseRun = useOrch((s) => s.pauseRun);
  const resumeRun = useOrch((s) => s.resumeRun);
  const cancelRun = useOrch((s) => s.cancelRun);
  const validatePlan = useOrch((s) => s.validatePlan);
  const planFromGoal = useOrch((s) => s.planFromGoal);
  const setRunConfig = useOrch((s) => s.setRunConfig);
  const planStatus = useOrch((s) => s.planStatus);
  const [msg, setMsg] = useState<string | null>(null);

  if (!runDetail) {
    return <Empty title="Sin ejecución" hint="Crea una ejecución en el Panel para planificarla aquí." />;
  }
  const lvls = levels(tasks);
  const errors = issues.filter((x) => x.level === 'error');
  const warnings = issues.filter((x) => x.level === 'warning');

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    setMsg(null);
    try {
      await fn();
      setMsg(ok);
    } catch (e) {
      setMsg(String(e));
    }
  };

  return (
    <div className="grid gap-2 p-3 xl:grid-cols-2">
      <div className="card anim-enter p-3">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <p className="section-label">Plan: {runDetail.goal.slice(0, 80)}</p>
          <span className="mono text-[11px] text-forge-faint"><StateBadge state={runDetail.status} /></span>
        </div>
        <div className="mb-2 flex flex-wrap gap-1 text-[12px]">
          <button onClick={() => act(() => planFromGoal(runDetail.id, runDetail.goal), 'Plan generado: revísalo abajo.')} disabled={busy || !['borrador', 'pendiente_aprobacion'].includes(runDetail.status)} className="btn btn-ghost">
            {busy ? 'Coordinador trabajando…' : 'Generar plan con coordinador'}
          </button>
          <button onClick={() => act(() => validatePlan(runDetail.id), 'Validación actualizada.')} className="btn btn-ghost">Validar</button>
          {runDetail.status === 'borrador' && <button onClick={() => act(() => submitPlan(runDetail.id), 'Plan enviado a aprobación.')} className="btn btn-primary">Enviar a aprobación</button>}
          {runDetail.status === 'pendiente_aprobacion' && <button onClick={() => act(() => approvePlan(runDetail.id), 'Plan aprobado: ejecución en marcha.')} className="btn btn-primary">Aprobar y ejecutar</button>}
          {runDetail.status === 'en_ejecucion' && <button onClick={() => act(() => pauseRun(runDetail.id), 'Pausado: no se lanzan más tareas.')} className="btn btn-ghost">Pausar</button>}
          {runDetail.status === 'pausado' && <button onClick={() => act(() => resumeRun(runDetail.id), 'Reanudado.')} className="btn btn-primary">Reanudar</button>}
          {['en_ejecucion', 'pausado', 'pendiente_aprobacion', 'borrador'].includes(runDetail.status) && (
            <button onClick={() => act(() => cancelRun(runDetail.id), 'Ejecución cancelada.')} className="btn btn-ghost !text-forge-err">Cancelar</button>
          )}
        </div>
        {msg && <p className="mb-2 text-[12px] text-forge-muted">{msg}</p>}
        {planStatus && <PlanProgress status={planStatus} />}
        <p className="section-label mb-1">Modelo por defecto de la ejecución</p>
        <ModelPicker
          value={(runDetail.config.default_model as ModelValue | null) ?? null}
          allowInherit
          inheritLabel="Heredar (modelo de la sesión)"
          onChange={(v) => act(async () => {
            await setRunConfig(runDetail.id, { ...runDetail.config, default_model: v });
          }, 'Modelo por defecto actualizado.')}
        />
        <p className="section-label mb-1 mt-2">Validación ({errors.length} errores · {warnings.length} avisos)</p>
        {issues.length === 0 && <p className="text-[12px] text-forge-muted">Pulsa «Validar». Sin errores no hay aprobación.</p>}
        {errors.map((x, i) => <p key={i} className="text-[12px] text-forge-err">[{x.code}] {x.message}</p>)}
        {warnings.map((x, i) => <p key={i} className="text-[12px] text-forge-warn">[{x.code}] {x.message}</p>)}
      </div>
      <div className="card anim-enter p-3">
        <p className="section-label mb-2">Grafo de dependencias ({tasks.length} tareas)</p>
        {tasks.length === 0 && <p className="text-[12px] text-forge-muted">Plan vacío: genera con el coordinador o añade tareas en Tareas.</p>}
        {lvls.map((lvl, i) => (
          <div key={i} className="mb-2">
            <p className="mono mb-1 text-[10px] text-forge-faint">NIVEL {i}{i === 0 ? ' (sin dependencias: en paralelo)' : ' (espera al anterior)'}</p>
            <div className="flex flex-col gap-1">
              {lvl.map((t) => (
                <div key={t.id} className="flex items-center gap-2 rounded border border-forge-border-soft px-2 py-1 text-[12px]">
                  <AgentGlyph id={t.agent_id} />
                  <span className="min-w-0 flex-1 truncate font-semibold">{t.name}</span>
                  <span className="mono hidden truncate text-[10px] text-forge-faint lg:block">{t.skills.slice(0, 3).join(', ')}</span>
                  <StateBadge state={t.state} />
                </div>
              ))}
            </div>
            {i < lvls.length - 1 && <div className="py-0.5 text-center text-forge-faint">▼</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Visualizador en vivo: qué hace el coordinador mientras genera el plan. */
function PlanProgress({ status }: { status: { phase: string; detail?: string; startedAt: number; excerpt?: string } }) {
  const [now, setNow] = useState(Date.now());
  const [showExcerpt, setShowExcerpt] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const secs = Math.max(0, Math.round((now - status.startedAt) / 1000));
  const mm = Math.floor(secs / 60);
  const ss = String(secs % 60).padStart(2, '0');
  return (
    <div className="anim-enter mb-2 rounded-xl border border-forge-accent-dim bg-forge-accent-soft px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="dot-live inline-block h-2 w-2 rounded-full bg-forge-accent" />
        <span className="text-[13px] font-bold">{status.phase}</span>
        <span className="mono ml-auto text-[11px] text-forge-muted">{mm}:{ss}</span>
      </div>
      {status.detail && <p className="mt-0.5 truncate text-[12px] text-forge-muted" title={status.detail}>{status.detail}</p>}
      {status.excerpt ? (
        <div className="mt-1">
          <button onClick={() => setShowExcerpt((v) => !v)} className="text-[11px] text-forge-accent hover:underline">
            {showExcerpt ? '▾ Ocultar lo que va escribiendo' : '▸ Ver lo que va escribiendo'}
          </button>
          {showExcerpt && (
            <pre className="mono mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded bg-forge-bg p-2 text-[11px] text-forge-muted">{status.excerpt}</pre>
          )}
        </div>
      ) : (
        <p className="mt-0.5 text-[11px] text-forge-faint">Aún sin texto del modelo: está pensando. Si tarda muchos minutos, puede ser falta de cuota.</p>
      )}
    </div>
  );
}
