import { useApp } from '../stores/app';
import { useSessions } from '../stores/sessions';
import { useProjects } from '../stores/projects';
import { StatusPill } from './StatusDot';

const CONN_LABEL: Record<string, string> = {
  desconocido: 'OpenCode · sin comprobar',
  detectando: 'Detectando…',
  'no-encontrado': 'OpenCode · no encontrado',
  detenido: 'OpenCode · detenido',
  iniciando: 'Iniciando servidor…',
  conectado: 'OpenCode · conectado',
  error: 'OpenCode · error',
};

export function Topbar({
  onToggleRight,
  onToggleBottom,
}: {
  onToggleRight: () => void;
  onToggleBottom: () => void;
}) {
  const { conn, detect, server, error } = useApp();
  const sessions = useSessions();
  const activeProject = useProjects((s) => s.active);

  const handleConnect = async () => {
    if (conn === 'conectado' && server?.url) return;
    if (!detect?.found) await useApp.getState().detectOpencode();
    const st = useApp.getState();
    if (st.detect?.found && st.conn !== 'conectado') {
      await st.startServer();
      const s2 = useApp.getState();
      if (s2.server?.url) sessions.connect(s2.server.url, s2.server.password);
    }
  };

  const handleDisconnect = async () => {
    sessions.disconnect();
    await useApp.getState().stopServer();
  };

  return (
    <header className="flex h-11 shrink-0 items-center gap-3 border-b border-forge-border bg-forge-panel px-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className="section-label">Proyecto</span>
        <span className="truncate text-[13px] font-semibold" title={activeProject?.path}>
          {activeProject ? activeProject.name : <span className="font-normal text-forge-faint">sin proyecto</span>}
        </span>
      </div>
      <span className="text-forge-border">|</span>
      <StatusPill
        state={conn}
        label={conn === 'conectado' && server?.version ? `OpenCode ${server.version}` : CONN_LABEL[conn] ?? conn}
        title={server?.url ?? detect?.path ?? error ?? undefined}
      />
      <div className="ml-auto flex items-center gap-1.5">
        {conn === 'conectado' ? (
          <button onClick={handleDisconnect} className="btn btn-ghost" title="Detener el servidor gestionado">
            ⏹ Detener
          </button>
        ) : (
          <button onClick={handleConnect} disabled={conn === 'iniciando' || conn === 'detectando'} className="btn btn-primary" title={detect?.path ?? 'Detectar e iniciar OpenCode'}>
            {conn === 'iniciando' ? <span className="dot-live">●</span> : '▶'} {conn === 'iniciando' ? 'Iniciando…' : 'Conectar'}
          </button>
        )}
        <button onClick={onToggleRight} className="btn btn-ghost" title="Mostrar/ocultar inspector (panel derecho)">
          ◧ Inspector
        </button>
        <button onClick={onToggleBottom} className="btn btn-ghost" title="Mostrar/ocultar consola (panel inferior)">
          ◨ Consola
        </button>
      </div>
    </header>
  );
}
