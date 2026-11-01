import { useEffect, useState } from 'react';
import { useSessions } from '../stores/sessions';

// Estado real: Studio instalado/en ejecución (vía toolchain) + servidores MCP
// reportados por OpenCode para el directorio del proyecto (vía /api/mcp).
// La "conexión verificada con un place abierto" requiere Studio abierto y una
// sesión de agente: se indica como pendiente manual, no se simula.
export function StudioPanel({ projectDir }: { projectDir: string | null }) {
  const client = useSessions((s) => s.client);
  const [servers, setServers] = useState<Array<{ name: string; status?: { status?: string } }>>([]);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const check = async () => {
    if (!client) return;
    setError(null);
    try {
      const list = await client.listMcpServers(projectDir ?? undefined);
      setServers(list);
      setCheckedAt(new Date().toLocaleTimeString());
    } catch (e) {
      setError(String(e));
    }
  };

  useEffect(() => {
    check().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectDir]);

  return (
    <div className="rounded border border-forge-border bg-forge-panel p-2 text-[12px]">
      <div className="mb-1 flex items-center">
        <p className="font-bold text-forge-muted">ROBLOX STUDIO · MCP</p>
        <button onClick={check} disabled={!client} className="ml-auto rounded border border-forge-border px-2 py-0.5 disabled:opacity-50">
          Recomprobar
        </button>
      </div>
      {!client && <p className="text-forge-muted">Requiere OpenCode conectado (los MCP viven en su configuración).</p>}
      {error && <p className="text-forge-err">{error}</p>}
      {client && servers.length === 0 && !error && (
        <p className="text-forge-muted">El servidor no reporta MCP en esta ubicación. Abre una sesión del proyecto o verifica la configuración MCP.</p>
      )}
      {servers.map((s) => (
        <div key={s.name} className="flex items-center gap-2 py-0.5">
          <span className={s.status?.status === 'connected' ? 'text-forge-ok' : 'text-forge-warn'}>●</span>
          <span className="mono">{s.name}</span>
          <span className="text-forge-muted">{s.status?.status ?? 'desconocido'}</span>
        </div>
      ))}
      {checkedAt && <p className="mono mt-1 text-[10px] text-forge-muted">Última comprobación: {checkedAt}</p>}
      <p className="mt-1 text-[11px] text-forge-muted">
        Verificación con place abierto: pendiente manual (Studio abierto + Assistant → MCP activado + prueba en Asistente).
      </p>
    </div>
  );
}
