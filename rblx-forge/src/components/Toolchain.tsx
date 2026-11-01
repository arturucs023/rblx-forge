import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useProjects } from '../stores/projects';

interface ToolStatus {
  tool: string;
  installed: boolean;
  version?: string;
  path?: string;
  detail?: string;
}

export const TOOL_DESC: Record<string, string> = {
  opencode: 'Motor de IA (gestionado por Forge)',
  git: 'Control de versiones',
  node: 'Runtime JS (herramientas)',
  rojo: 'Sync disco ↔ Studio',
  stylua: 'Formato Luau',
  selene: 'Lint Luau',
  wally: 'Dependencias Luau',
  testez: 'Framework de tests',
  studio: 'Roblox Studio',
};

export function Toolchain() {
  const active = useProjects((s) => s.active);
  const [tools, setTools] = useState<ToolStatus[]>([]);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const check = async () => {
    setChecking(true);
    setError(null);
    try {
      setTools(await invoke<ToolStatus[]>('toolchain_status', { projectDir: active?.path ?? null }));
    } catch (e) {
      setError(String(e));
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    check().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.path]);

  return (
    <div className="max-w-3xl p-3">
      <div className="mb-2 flex items-center">
        <p className="font-bold">Toolchain {active && <span className="mono font-normal text-forge-muted">· {active.name}</span>}</p>
        <button onClick={check} disabled={checking} className="ml-auto rounded border border-forge-border px-2 py-0.5 text-[12px] disabled:opacity-50">
          {checking ? 'Comprobando…' : 'Recomprobar'}
        </button>
      </div>
      {error && <p className="mb-2 text-forge-err">{error}</p>}
      <table className="w-full text-[12px]">
        <thead>
          <tr className="text-left">
            <th className="section-label py-1 pr-2">Herramienta</th>
            <th className="section-label py-1 pr-2">Estado</th>
            <th className="section-label py-1 pr-2">Versión</th>
            <th className="section-label py-1">Ruta / detalle</th>
          </tr>
        </thead>
        <tbody>
          {tools.map((t) => (
            <tr key={t.tool} className="row-hover border-t border-forge-border-soft">
              <td className="py-1.5 pr-2 font-semibold">{TOOL_DESC[t.tool] ?? t.tool}</td>
              <td className="py-1.5 pr-2">{t.installed ? <span className="pill pill-ok">● instalado</span> : <span className="pill pill-err">○ no instalado</span>}</td>
              <td className="mono py-1.5 pr-2 text-[11px]">{t.version ?? '—'}</td>
              <td className="mono max-w-72 truncate py-1.5 text-[11px] text-forge-faint" title={t.path ?? t.detail ?? ''}>{t.path ?? t.detail ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[11px] text-forge-muted">
        Detección real (ejecuta `--version`, inspecciona el disco y el registro de procesos). Forge no instala ni
        modifica herramientas globales; el binario de Rojo vendoreado se usa si el proyecto vive bajo el workspace.
      </p>
    </div>
  );
}
