// Cabecera del asistente: estado de conexión + contexto real del proyecto.
// No inventa contexto: solo muestra proyecto activo, directorio y sesión.
import { useApp } from '../../stores/app';
import { useProjects } from '../../stores/projects';
import { useSessions } from '../../stores/sessions';

export function AssistantHeader() {
  const conn = useApp((s) => s.conn);
  const version = useApp((s) => s.server?.version);
  const project = useProjects((s) => s.active);
  const cwd = useSessions((s) => s.cwd);
  const activeId = useSessions((s) => s.activeId);
  const sessions = useSessions((s) => s.sessions);
  const skillsTotal = useSessions((s) => s.skillsTotal);
  const skillsAttached = useSessions((s) => s.skillsAttached);
  const active = sessions.find((s) => s.id === activeId);
  const connected = conn === 'conectado';

  return (
    <div className="flex items-center gap-2 border-b border-forge-border-soft bg-forge-panel/70 px-3 py-1.5">
      <span
        title={connected ? `OpenCode conectado${version ? ` v${version}` : ''}` : 'OpenCode no conectado'}
        className={`inline-block h-2 w-2 shrink-0 rounded-full ${connected ? 'bg-forge-ok' : 'bg-forge-err'}`}
      />
      <div className="min-w-0 flex-1 truncate text-[12px]">
        {project ? (
          <span title={project.path}>
            <span className="font-bold text-forge-text">{project.name}</span>
            <span className="mono ml-2 text-forge-faint">{project.path}</span>
          </span>
        ) : (
          <span className="text-forge-faint">Sin proyecto abierto · {cwd || 'sin directorio'}</span>
        )}
      </div>
      {skillsTotal !== null && skillsTotal > 0 && (
        <span
          className="mono hidden shrink-0 truncate rounded-md border border-forge-border bg-forge-panel2 px-1.5 py-0.5 text-[10px] text-forge-muted md:block"
          title={`Catálogo exclusivo de skills propias inyectado al iniciar cada chat (${skillsTotal} skills). Solo se usan estas; nunca ajenas.${skillsAttached.length ? ` Adjuntadas en el último envío: ${skillsAttached.join(', ')}` : ''}`}
        >
          📚 {skillsTotal} propias{skillsAttached.length ? ` · ${skillsAttached.length} adjunta${skillsAttached.length === 1 ? '' : 's'}` : ''}
        </span>
      )}
      {active && (
        <span className="mono hidden shrink-0 truncate text-[10px] text-forge-faint sm:block" title={active.id}>
          {active.title || active.id.slice(0, 8)}
        </span>
      )}
    </div>
  );
}
