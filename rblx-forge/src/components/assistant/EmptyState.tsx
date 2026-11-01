// Estado vacío con sugerencias que rellenan el composer (no envían solas).
import { useSessions } from '../../stores/sessions';

const SUGGESTIONS = [
  'Explica la estructura de este proyecto y qué hace cada carpeta',
  'Crea un ModuleScript de ejemplo con una función documentada',
  '¿Qué modelo estás usando y con qué variante?',
];

export function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  const busy = useSessions((s) => s.busy);
  const activeId = useSessions((s) => s.activeId);
  return (
    <div className="anim-enter mx-auto mt-10 w-full max-w-md rounded-xl border border-dashed border-forge-border bg-forge-panel p-6 text-center">
      <div className="mb-1 text-2xl">✦</div>
      <p className="font-bold">Empieza una conversación</p>
      <p className="mt-1 text-[12px] text-forge-muted">
        {activeId ? 'Escribe abajo o prueba una de estas ideas. Los adjuntos (📎) van como file:// al modelo.' : 'Crea una sesión primero para empezar a hablar con OpenCode en el directorio del proyecto.'}
      </p>
      <div className="mt-3 flex flex-col gap-1.5">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            disabled={!activeId || busy}
            className="rounded-lg border border-forge-border-soft px-2.5 py-1.5 text-left text-[12px] text-forge-muted transition-colors hover:border-forge-accent-dim hover:text-forge-text disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
