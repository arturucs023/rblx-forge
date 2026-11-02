import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';
import { useSessions } from '../stores/sessions';

export const MCP_RELEASES_URL = 'https://github.com/Chrrxs/robloxstudio-mcp/releases';

// Estado real: Studio instalado/en ejecución (vía toolchain) + servidores MCP
// reportados por OpenCode para el directorio del proyecto (vía /api/mcp) +
// autoconfiguración del puente `roblox-studio` en .opencode/opencode.json.
// El plugin de Studio (MCPPlugin.rbxmx) y su activación son manuales.
export function StudioPanel({ projectDir }: { projectDir: string | null }) {
  const client = useSessions((s) => s.client);
  const [servers, setServers] = useState<Array<{ name: string; status?: { status?: string } }>>([]);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fixing, setFixing] = useState(false);
  const [fixMsg, setFixMsg] = useState<string | null>(null);

  const autoFix = async () => {
    if (!projectDir) {
      setFixMsg('Abre un proyecto primero: la configuración vive en su carpeta.');
      return;
    }
    setFixing(true);
    setFixMsg(null);
    try {
      const r = await invoke<{ configured: boolean; created_file: boolean; detail: string }>('mcp_ensure_roblox', { projectDir });
      setFixMsg(r.detail);
      await check();
    } catch (e) {
      setFixMsg(String(e).slice(0, 400));
    } finally {
      setFixing(false);
    }
  };

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
      <div className="mt-1.5 flex flex-wrap gap-1">
        <button onClick={autoFix} disabled={fixing || !projectDir} className="btn btn-primary !py-0.5 !text-[11px] disabled:opacity-50" title="Escribe roblox-studio en .opencode/opencode.json del proyecto (sin tocar el resto)">
          {fixing ? 'Configurando…' : 'Autoconfigurar MCP'}
        </button>
        <button onClick={() => openUrl(MCP_RELEASES_URL).catch(() => {})} className="btn btn-ghost !py-0.5 !text-[11px]" title="Descarga MCPPlugin.rbxmx de la última release">
          Descargar plugin ↗
        </button>
      </div>
      {fixMsg && <p className="mono mt-1 whitespace-pre-wrap break-words text-[11px] text-forge-muted">{fixMsg}</p>}
      {checkedAt && <p className="mono mt-1 text-[10px] text-forge-muted">Última comprobación: {checkedAt}</p>}
      <p className="mt-1 text-[11px] text-forge-muted">
        Plugin manual: descarga <span className="mono">MCPPlugin.rbxmx</span> de la última release,
        en Studio ve a Plugins → carpeta de plugins y pégalo ahí, cierra y reabre Studio del todo.
      </p>
    </div>
  );
}
