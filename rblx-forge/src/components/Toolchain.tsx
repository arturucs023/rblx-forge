import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { confirm } from '@tauri-apps/plugin-dialog';
import { useProjects } from '../stores/projects';
import { useApp } from '../stores/app';

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
        modifica herramientas globales, salvo la actualización explícita de OpenCode de abajo. El binario vendoreado
        se usa si el proyecto vive bajo el workspace o si `workspace.dir` apunta al entorno con `tools/`.
      </p>
      <OpencodeUpdate current={tools.find((t) => t.tool === 'opencode')?.version} onChanged={check} />
    </div>
  );
}

interface UpdateCheck {
  current?: string | null;
  latest?: string | null;
  update_available: boolean;
  npm_managed: boolean;
  note?: string | null;
}

function OpencodeUpdate({ current, onChanged }: { current?: string; onChanged: () => void }) {
  const [chk, setChk] = useState<UpdateCheck | null>(null);
  const [busy, setBusy] = useState<'check' | 'update' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const check = async () => {
    setBusy('check');
    setError(null);
    setDone(null);
    try {
      setChk(await invoke<UpdateCheck>('opencode_update_check'));
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(null);
    }
  };

  const update = async () => {
    setError(null);
    setDone(null);
    let ok = false;
    try {
      ok = await confirm('Actualizar OpenCode global (@opencode/cli@latest)? Se detendrá el servidor gestionado de Forge (el servicio global no se toca).', {
        title: 'Actualizar OpenCode',
        kind: 'warning',
      });
    } catch {
      ok = window.confirm('Actualizar OpenCode global? Se detendrá el servidor gestionado de Forge.');
    }
    if (!ok) return;
    setBusy('update');
    try {
      const r = await invoke<{ version: string; log_tail: string }>('opencode_update');
      setDone(`Actualizado a ${r.version}. Vuelve a «Conectar» para usar el nuevo servidor.`);
      setChk(null);
      onChanged();
      useApp.getState().detectOpencode().catch(() => {});
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="card mt-2 p-2.5">
      <p className="mb-1 text-[12px] font-bold">Actualización de OpenCode <span className="mono font-normal text-forge-faint">instalado: {current ?? '—'}</span></p>
      {error && <p className="mb-1 text-[12px] text-forge-err">{String(error).slice(0, 600)}</p>}
      {done && <p className="mb-1 text-[12px] text-forge-ok">{done}</p>}
      {chk && (
        <p className="mb-1 text-[12px] text-forge-muted">
          Instalada: <span className="mono">{chk.current ?? '—'}</span> · Última: <span className="mono">{chk.latest ?? 'desconocida'}</span>
          {chk.note ? ` · ${chk.note}` : ''}
          {!chk.npm_managed && ' (No gestionable por Forge: instalación no-npm.)'}
        </p>
      )}
      <div className="flex gap-2">
        <button onClick={check} disabled={busy !== null} className="btn btn-ghost">
          {busy === 'check' ? 'Consultando…' : 'Comprobar actualización'}
        </button>
        {chk?.update_available && (
          <button onClick={update} disabled={busy !== null} className="btn btn-primary">
            {busy === 'update' ? 'Actualizando… (puede tardar minutos)' : `Actualizar a ${chk.latest}`}
          </button>
        )}
      </div>
      <p className="mt-1 text-[10px] text-forge-faint">Solo para instalaciones npm globales. Nunca toca tu servicio global en ejecución; si el servidor gestionado está activo, se detiene antes.</p>
    </div>
  );
}
