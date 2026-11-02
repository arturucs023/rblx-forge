import { useApp } from '../stores/app';
import { useSessions } from '../stores/sessions';
import { Activity } from './Activity';
import { Terminal } from './Terminal';
import { useProjects } from '../stores/projects';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { useEffect, useState } from 'react';
import { TOOL_DESC } from './Toolchain';
import type { ModuleId } from './Sidebar';
import { FirstRun } from './FirstRun';
import { getWorkspaceDir } from '../lib/paths';

export const DEFAULT_WORKSPACE = '';

// Fuente única de rutas: src/lib/paths.ts (con selector de carpetas).
export { getWorkspaceDir };

export function PendingBadge({ phase }: { phase: string }) {
  return (
    <span className="ml-2 rounded border border-forge-warn px-1.5 py-0.5 text-[10px] text-forge-warn">
      PENDIENTE · {phase}
    </span>
  );
}

export function PlaceholderModule({ title, desc, phase }: { title: string; desc: string; phase: string }) {
  return (
    <div className="p-4">
      <p className="mb-2 text-sm font-bold">
        {title}
        <PendingBadge phase={phase} />
      </p>
      <p className="max-w-2xl text-forge-muted">{desc}</p>
      <p className="mt-2 max-w-2xl text-[12px] text-forge-muted">
        Esta función aún no está implementada. Se muestra su estado real en lugar de simularla.
      </p>
    </div>
  );
}

export function HomeModule({ onGo }: { onGo: (m: ModuleId) => void }) {
  const { conn, detect, server, error, detectOpencode, startServer } = useApp();
  const [stats, setStats] = useState<{ installed: number; own: number; total: number } | null>(null);
  const [noWorkspace, setNoWorkspace] = useState(false);
  useEffect(() => {
    getWorkspaceDir().then((dir) => {
      if (!dir) { setNoWorkspace(true); return; }
      invoke<{ installed: number; own: number; total: number }>('workspace_stats', { workspaceDir: dir })
        .then(setStats)
        .catch(() => setNoWorkspace(true));
    }).catch(() => setNoWorkspace(true));
  }, []);
  const statusPill =
    conn === 'conectado' ? <span className="pill pill-ok">● conectado</span>
    : conn === 'error' ? <span className="pill pill-err">● error</span>
    : conn === 'iniciando' || conn === 'detectando' ? <span className="pill pill-warn">● {conn}…</span>
    : <span className="pill pill-neutral">● {conn}</span>;
  return (
    <div className="mx-auto max-w-3xl p-5">
      <div className="anim-enter">
        <p className="section-label mb-1">Entorno profesional de desarrollo Roblox</p>
        <h1 className="mb-1 text-[26px] font-extrabold tracking-tight">
          <span className="text-forge-accent">RBLX</span> Forge
        </h1>
        <p className="mb-4 max-w-xl text-[13px] leading-relaxed text-forge-muted">
          Proyectos, código Luau, asistente IA con OpenCode, Studio y pruebas — todo en una única aplicación de escritorio.
        </p>
      </div>
      <FirstRun onGo={onGo} />
      <div className="card anim-enter p-4" style={{ animationDelay: '60ms' }}>
        <div className="mb-2 flex items-center gap-2">
          <span className="font-bold">OpenCode</span>
          {statusPill}
          <span className="mono ml-auto hidden truncate text-[11px] text-forge-faint sm:inline">{server?.url ?? detect?.path ?? ''}</span>
        </div>
        {server?.version && <p className="mono mb-2 text-[11px] text-forge-muted">v{server.version}{server.pid ? ` · pid ${server.pid}` : ''}</p>}
        {error && <p className="mb-2 rounded-lg border border-forge-err/40 bg-forge-err-soft p-2 text-[12px] text-forge-err">{String(error).slice(0, 500)}</p>}
        {detect && !detect.found && (
          <p className="mono mb-2 break-all text-[11px] text-forge-muted">Rutas probadas: {(detect.tried ?? []).join(' · ').slice(0, 400) || '(ninguna)'}</p>
        )}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => detectOpencode()} className="btn btn-ghost">Detectar</button>
          <button onClick={() => startServer()} disabled={conn === 'conectado' || conn === 'iniciando'} className="btn btn-primary disabled:opacity-50">
            {conn === 'conectado' ? 'Conectado ✓' : conn === 'iniciando' ? 'Iniciando…' : 'Iniciar y conectar'}
          </button>
          {conn === 'conectado' && (
            <button onClick={() => onGo('asistente')} className="btn btn-ghost">Abrir Asistente →</button>
          )}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        {[
          [noWorkspace ? '—' : stats ? String(stats.total) : '…', stats ? `skills (${stats.installed}+${stats.own})` : 'skills'],
          [String(Object.keys(TOOL_DESC).length), 'herramientas'],
          ['1', 'motor IA'],
        ].map(([n, label]) => (
          <div key={label} className="card card-hover anim-enter p-3" style={{ animationDelay: '120ms' }}>
            <div className="text-xl font-extrabold text-forge-accent">{n}</div>
            <div className="text-[11px] text-forge-muted">{label}</div>
          </div>
        ))}
      </div>
      {noWorkspace && (
        <div className="card anim-enter mt-3 border-forge-warn/40 p-3">
          <p className="text-[13px] font-bold">Configura tu workspace</p>
          <p className="mt-1 text-[12px] text-forge-muted">Indica la carpeta del proyecto Roblox para activar el conteo de skills y las herramientas vendoreadas.</p>
          <button onClick={() => onGo('configuracion')} className="btn btn-primary mt-2">Ir a Configuración →</button>
        </div>
      )}
    </div>
  );
}

export function RightPanel() {
  const { activity, clearActivity } = useApp();
  const { activeId, sessions, permissions, clearFeed } = useSessions();
  const [tab, setTab] = useState<'inspector' | 'actividad'>('actividad');
  const active = sessions.find((s) => s.id === activeId);
  const clearAll = () => {
    try { clearFeed(); } catch { /* noop */ }
    try { clearActivity(); } catch { /* noop */ }
  };
  return (
    <div className="flex h-full flex-col border-l border-forge-border-soft bg-forge-panel">
      <div className="flex items-center gap-1 border-b border-forge-border-soft px-2.5 py-1.5">
        <button onClick={() => setTab('inspector')} className={`rounded-md px-2 py-0.5 text-[12px] font-semibold transition-colors ${tab === 'inspector' ? 'bg-forge-panel3 text-forge-accent' : 'text-forge-faint hover:text-forge-text'}`}>Inspector</button>
        <button onClick={() => setTab('actividad')} className={`rounded-md px-2 py-0.5 text-[12px] font-semibold transition-colors ${tab === 'actividad' ? 'bg-forge-panel3 text-forge-accent' : 'text-forge-faint hover:text-forge-text'}`}>Actividad</button>
        <button onClick={clearAll} title="Vaciar actividad e inspector" className="ml-auto rounded-md px-2 py-0.5 text-[11px] text-forge-faint hover:text-forge-err">Limpiar</button>
      </div>
      {tab === 'actividad' ? (
        <div className="min-h-0 flex-1"><Activity /></div>
      ) : (
        <>
          <div className="border-b border-forge-border p-2 text-[12px]">
            <p>
              Sesión: <span className="mono">{active ? (active.title || active.id.slice(0, 8)) : '(ninguna)'}</span>
            </p>
            <p>
              Permisos pendientes: <span className="text-forge-warn">{permissions.length}</span>
            </p>
            <p className="mt-1 text-forge-muted">Herramientas y archivos: pestaña Actividad (eventos reales).</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {activity.slice(-60).reverse().map((a) => (
              <div key={a.id} className="mono mb-1 break-words text-[11px]">
                <span className="text-forge-muted">{a.ts.slice(11, 19)}</span>{' '}
                <span className={a.level === 'error' ? 'text-forge-err' : a.level === 'warn' ? 'text-forge-warn' : 'text-forge-accent'}>
                  [{a.target}]
                </span>{' '}
                {a.message.slice(0, 220)}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function BottomPanel() {
  const { activity, clearActivity } = useApp();
  const activePath = useProjects((s) => s.active?.path ?? null);
  const [tab, setTab] = useState<'terminal' | 'logs' | 'errores'>('terminal');
  const errors = activity.filter((a) => a.level === 'error');
  // Vigilar el proyecto activo: refresca el explorador con debounce.
  useEffect(() => {
    if (!activePath) return;
    invoke('fs_watch_start', { projectDir: activePath }).catch(() => {});
    let timer: ReturnType<typeof setTimeout> | null = null;
    let unlisten: (() => void) | null = null;
    listen<{ rel: string; kind: string }>('forge:fs-changed', () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        useProjects.getState().loadTree(useProjects.getState().treeRoot).catch(() => {});
      }, 600);
    }).then((u) => { unlisten = u; }).catch(() => {});
    return () => {
      if (timer) clearTimeout(timer);
      if (unlisten) unlisten();
      invoke('fs_watch_stop').catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePath]);
  return (
    <div className="flex h-full flex-col border-t border-forge-border bg-forge-panel">
      <div className="flex items-center gap-1 border-b border-forge-border-soft px-2.5 py-1.5">
        <button onClick={() => setTab('terminal')} className={`rounded-md px-2 py-0.5 text-[12px] font-semibold transition-colors ${tab === 'terminal' ? 'bg-forge-panel3 text-forge-accent' : 'text-forge-faint hover:text-forge-text'}`}>Terminal</button>
        <button onClick={() => setTab('logs')} className={`rounded-md px-2 py-0.5 text-[12px] font-semibold transition-colors ${tab === 'logs' ? 'bg-forge-panel3 text-forge-accent' : 'text-forge-faint hover:text-forge-text'}`}>Logs <span className="mono font-normal">{activity.length}</span></button>
        <button onClick={() => setTab('errores')} className={`rounded-md px-2 py-0.5 text-[12px] font-semibold transition-colors ${tab === 'errores' ? 'bg-forge-panel3 text-forge-err' : 'text-forge-faint hover:text-forge-text'}`}>Errores <span className="mono font-normal">{errors.length}</span></button>
        <span className="mono ml-1 hidden truncate text-[10px] text-forge-faint lg:inline" title={activePath ?? ''}>{activePath ?? 'sin proyecto'}</span>
        <button onClick={clearActivity} className="ml-auto text-[11px] text-forge-faint hover:text-forge-text">Limpiar</button>
      </div>
      {tab === 'terminal' && (
        <div className="min-h-0 flex-1 p-1"><Terminal key={activePath ?? 'none'} cwd={activePath} /></div>
      )}
      {tab !== 'terminal' && (
        <div className="mono min-h-0 flex-1 overflow-y-auto p-2 text-[11px]">
          {(tab === 'errores' ? errors : activity).slice(-80).reverse().map((a) => (
            <div key={a.id} className="break-words">
              <span className="text-forge-muted">{a.ts.slice(11, 19)}</span> [{a.level}/{a.target}] {a.message.slice(0, 300)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
