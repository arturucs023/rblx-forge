export type ModuleId =
  | 'inicio'
  | 'proyectos'
  | 'editor'
  | 'viewport'
  | 'recursos'
  | 'referencias'
  | 'asistente'
  | 'testing'
  | 'evaluacion'
  | 'orquestador'
  | 'configuracion';

function Icon({ d, active }: { d: string; active?: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke={active ? 'var(--color-forge-accent)' : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

const ICONS: Record<ModuleId, string> = {
  inicio: 'M2.5 8 8 2.5 13.5 8M4 7v6.5h8V7',
  proyectos: 'M2.5 2.5h11v11h-11zM2.5 5.5h11M5.5 2.5v11',
  editor: 'M11.5 2.5l2 2L5 13l-2.5.5L3 11z',
  viewport: 'M2.5 2.5h11v11h-11zM2.5 10.5l3.5-3.5 2.5 2.5 2-2 3 3',
  recursos: 'M8 2.5l5.5 3v5L8 13.5 2.5 10.5v-5zM2.5 5.5L8 8.5l5.5-3M8 8.5v5',
  referencias: 'M3 3h7l3 3v7H3zM10 3v3h3M6 8h4M6 10.5h4',
  asistente: 'M8 1.8l1.7 3.6 3.9.5-2.9 2.7.7 3.9L8 10.7l-3.4 1.8.7-3.9-2.9-2.7 3.9-.5z',
  testing: 'M8 1.8v3M4.2 3.2l1.5 2.6M3 8h12M5 13.5l-1 1.5M11 13.5l1 1.5M8 8v5.5',
  evaluacion: 'M3 3h7l3 3v7H3zM6 8l1.2 1.2L10 6.5M6 11.5h4',
  orquestador: 'M8 2v12M4 6l4-4 4 4M4 10l4 4 4-4',
  configuracion: 'M8 5.5A2.5 2.5 0 1 0 8 10.5 2.5 2.5 0 1 0 8 5.5M8 1.8v1.7M8 12.5v1.7M1.8 8h1.7M12.5 8h1.7M3.6 3.6l1.2 1.2M11.2 11.2l1.2 1.2M12.4 3.6l-1.2 1.2M4.8 11.2l-1.2 1.2',
};

const SECTIONS: { title: string; items: ModuleId[] }[] = [
  { title: 'Principal', items: ['inicio', 'proyectos', 'editor', 'viewport'] },
  { title: 'Contenido', items: ['recursos', 'referencias'] },
  { title: 'Inteligencia', items: ['asistente'] },
  { title: 'Calidad', items: ['testing', 'evaluacion', 'orquestador'] },
  { title: 'Sistema', items: ['configuracion'] },
];

const LABELS: Record<ModuleId, string> = {
  inicio: 'Inicio',
  proyectos: 'Proyectos',
  editor: 'Editor',
  viewport: 'Viewport',
  recursos: 'Recursos',
  referencias: 'Referencias',
  asistente: 'Asistente IA',
  testing: 'Testing',
  evaluacion: 'Evaluación',
  orquestador: 'Orquestador',
  configuracion: 'Configuración',
};

export function Sidebar({ active, onSelect }: { active: ModuleId; onSelect: (m: ModuleId) => void }) {
  return (
    <nav className="flex h-full w-48 shrink-0 flex-col border-r border-forge-border bg-forge-panel">
      <div className="px-3 pb-1 pt-3">
        <div className="text-[15px] font-extrabold tracking-wide">
          <span className="text-forge-accent">RBLX</span> <span className="text-forge-text">Forge</span>
        </div>
        <div className="mono mt-0.5 text-[10px] text-forge-faint">v0.1.0 · Tauri + OpenCode</div>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-1">
        {SECTIONS.map((s) => (
          <div key={s.title} className="mb-1.5">
            <div className="section-label px-2 pb-1 pt-1">{s.title}</div>
            {s.items.map((id) => {
              const isActive = id === active;
              return (
                <button
                  key={id}
                  onClick={() => onSelect(id)}
                  className={`relative mb-0.5 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-left text-[13px] transition-colors ${
                    isActive ? 'bg-forge-panel3 text-forge-text' : 'text-forge-muted hover:bg-forge-panel2 hover:text-forge-text'
                  }`}
                >
                  {isActive && <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-forge-accent" />}
                  <span className={isActive ? '' : 'opacity-80'}><Icon d={ICONS[id]} active={isActive} /></span>
                  {LABELS[id]}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div className="border-t border-forge-border-soft px-3 py-2 text-[10px] leading-4 text-forge-faint">
        Motor IA · OpenCode
        <br />
        Sin proveedores externos.
      </div>
    </nav>
  );
}
