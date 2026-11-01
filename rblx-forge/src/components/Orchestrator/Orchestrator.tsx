// Orquestador multiagente: panel, agentes, tareas, ejecución, plan,
// revisión e historial. Datos reales de orch.db vía el store; sin datos,
// estados vacíos profesionales (nada simulado).
import { useEffect, useState } from 'react';
import { useOrch } from '../../stores/orch';
import { Dashboard } from './Dashboard';
import { Agents } from './Agents';
import { Tasks } from './Tasks';
import { Monitor } from './Monitor';
import { Plan } from './Plan';
import { Review } from './Review';
import { History } from './History';

type Tab = 'panel' | 'agentes' | 'tareas' | 'ejecucion' | 'plan' | 'revision' | 'historial';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'panel', label: 'Panel' },
  { id: 'agentes', label: 'Agentes' },
  { id: 'tareas', label: 'Tareas' },
  { id: 'ejecucion', label: 'Ejecución' },
  { id: 'plan', label: 'Plan' },
  { id: 'revision', label: 'Revisión' },
  { id: 'historial', label: 'Historial' },
];

export function Orchestrator() {
  const [tab, setTab] = useState<Tab>('panel');
  const ready = useOrch((s) => s.ready);
  const busy = useOrch((s) => s.busy);
  const error = useOrch((s) => s.error);
  const lastEvent = useOrch((s) => s.lastEvent);
  const refreshAll = useOrch((s) => s.refreshAll);

  useEffect(() => {
    if (!ready) refreshAll().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-forge-border-soft px-3 py-2">
        <p className="font-bold">Orquestador multiagente</p>
        <span className="mono text-[11px] text-forge-faint">coordinación · especialistas · OpenCode</span>
        <button onClick={() => refreshAll()} disabled={busy} className="btn btn-ghost ml-auto">
          {busy ? 'Cargando…' : 'Actualizar'}
        </button>
      </div>
      {error && <p className="border-b border-forge-err/30 bg-forge-err-soft px-3 py-1 text-[12px] text-forge-err">{String(error).slice(0, 500)}</p>}
      <div className="flex gap-1 border-b border-forge-border-soft px-3 pt-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-t-md px-3 py-1.5 text-[12px] font-semibold ${tab === t.id ? 'bg-forge-panel3 text-forge-accent' : 'text-forge-muted hover:text-forge-text'}`}
          >
            {t.label}
          </button>
        ))}
        <span className="mono ml-auto hidden self-center text-[10px] text-forge-faint xl:block" title="Último evento del orquestador">{lastEvent ?? 'sin eventos'}</span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {tab === 'panel' && <Dashboard go={(t) => setTab(t)} />}
        {tab === 'agentes' && <Agents />}
        {tab === 'tareas' && <Tasks />}
        {tab === 'ejecucion' && <Monitor />}
        {tab === 'plan' && <Plan />}
        {tab === 'revision' && <Review />}
        {tab === 'historial' && <History />}
      </div>
    </div>
  );
}
