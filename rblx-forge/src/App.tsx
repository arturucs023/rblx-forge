import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getWorkspaceDir } from './components/panels';
import { Sidebar, type ModuleId } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { Assistant } from './components/Assistant';
import { Projects } from './components/Projects';
import { Explorer } from './components/Explorer';
import { LuauEditor } from './components/Editor';
import { Toolchain } from './components/Toolchain';
import { Library } from './components/Library';
import { Testing } from './components/Testing';
import { Evaluation } from './components/Evaluation/Evaluation';
import { Viewport } from './components/Viewport';
import { ModuleBoundary } from './components/ErrorBoundary';
import { useProjects } from './stores/projects';
import { HomeModule, RightPanel, BottomPanel } from './components/panels';
import { useApp } from './stores/app';
import { useSessions } from './stores/sessions';

function ProjectWorkspace() {
  const active = useProjects((s) => s.active);
  const [tab, setTab] = useState<'lista' | 'archivos'>('lista');
  const openProject = (dir: string) => {
    useSessions.getState().setCwd(dir);
    setTab('archivos');
  };
  return (
    <div className="flex h-full flex-col">
      {active && (
        <div className="flex items-center gap-1 border-b border-forge-border px-2 py-1 text-[12px]">
          <button onClick={() => setTab('lista')} className={tab === 'lista' ? 'font-bold text-forge-accent' : 'text-forge-muted'}>Proyectos</button>
          <span className="text-forge-border">|</span>
          <button onClick={() => setTab('archivos')} className={tab === 'archivos' ? 'font-bold text-forge-accent' : 'text-forge-muted'}>
            Archivos · <span className="mono">{active.name}</span>
          </button>
          <span className="ml-auto text-[11px] text-forge-muted">Sesiones vinculadas a: <span className="mono">{active.path}</span></span>
        </div>
      )}
      <div className="min-h-0 flex-1">{tab === 'lista' || !active ? <Projects onOpenProject={openProject} /> : <Explorer />}</div>
    </div>
  );
}

function Central({ module, go }: { module: ModuleId; go: (m: ModuleId) => void }) {
  switch (module) {
    case 'inicio':
      return <HomeModule onGo={go} />;
    case 'asistente':
      return <Assistant />;
    case 'proyectos':
      return <ProjectWorkspace />;
    case 'editor':
      return <LuauEditor />;
    case 'recursos':
      return <Library />;
    case 'referencias':
      return <Library />;
    case 'testing':
      return <Testing />;
    case 'evaluacion':
      return <Evaluation />;
    case 'viewport':
      return <Viewport />;
    case 'configuracion':
      return (
        <div className="h-full overflow-auto">
          <Toolchain />
          <WorkspaceSettings />
          <div className="max-w-3xl p-3 text-[12px] text-forge-muted">
            Tema, idioma, editor, terminal y comportamiento de confirmaciones: pendiente (FASE 8).
            Rutas de herramientas: ajuste `toolchain.*` (persistente, sin secretos).
          </div>
        </div>
      );
  }
}

function WorkspaceSettings() {
  const [dir, setDir] = useState('');
  const [saved, setSaved] = useState<string | null>(null);
  const [stats, setStats] = useState<{ installed: number; own: number; total: number } | null>(null);
  useEffect(() => {
    getWorkspaceDir().then((d) => {
      setDir(d);
      invoke<{ installed: number; own: number; total: number }>('workspace_stats', { workspaceDir: d }).then(setStats).catch(() => {});
    }).catch(() => {});
  }, []);
  const save = async () => {
    const trimmed = dir.trim();
    if (!trimmed) return;
    await invoke('settings_set', { key: 'workspace.dir', value: trimmed });
    try {
      setStats(await invoke('workspace_stats', { workspaceDir: trimmed }));
    } catch {
      setStats(null);
    }
    setSaved(new Date().toLocaleTimeString());
  };
  return (
    <div className="max-w-3xl p-3">
      <p className="mb-1 text-[12px] font-bold">Espacio de trabajo</p>
      <p className="mb-1 text-[11px] text-forge-muted">Carpeta raíz del entorno Roblox (skills, referencias, herramientas). Se usa para contar skills y resolver toolchains vendoreados.</p>
      <div className="flex gap-2">
        <input value={dir} onChange={(e) => { setDir(e.target.value); setSaved(null); }} placeholder="C:\ruta\al\workspace" className="input mono min-w-0 flex-1 !text-[12px]" />
        <button onClick={save} className="btn btn-ghost">Guardar</button>
      </div>
      <p className="mono mt-1 text-[11px] text-forge-muted">
        {stats ? `Skills detectadas: ${stats.total} (${stats.installed} instaladas + ${stats.own} propias)` : 'Sin comprobar.'}
        {saved ? ` · guardado ${saved}` : ''}
      </p>
    </div>
  );
}

export default function App() {
  const [module, setModule] = useState<ModuleId>('inicio');
  const [showRight, setShowRight] = useState(true);
  const [showBottom, setShowBottom] = useState(true);
  const serverUrl = useApp((s) => s.server?.url);
  const alive = useApp((s) => s.server?.alive);

  // Auto-vincular el store de sesiones cuando el servidor gestionado conecta.
  useEffect(() => {
    if (serverUrl && alive) useSessions.getState().connect(serverUrl, useApp.getState().server?.password);
  }, [serverUrl, alive]);

  // Detección inicial (solo lectura).
  useEffect(() => {
    useApp.getState().detectOpencode().catch(() => {});
    const go = () => setModule('asistente');
    document.addEventListener('forge:go-assistant', go);
    return () => document.removeEventListener('forge:go-assistant', go);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-full bg-forge-bg text-forge-text">
      <Sidebar active={module} onSelect={setModule} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onToggleRight={() => setShowRight((v) => !v)} onToggleBottom={() => setShowBottom((v) => !v)} />
        <div className="flex min-h-0 flex-1">
          <main className="min-w-0 flex-1 overflow-auto">
            <ModuleBoundary moduleName={module} key={module}>
              <Central module={module} go={setModule} />
            </ModuleBoundary>
          </main>
          {showRight && (
            <aside className="w-80 shrink-0">
              <ModuleBoundary moduleName="inspector" key="inspector">
                <RightPanel />
              </ModuleBoundary>
            </aside>
          )}
        </div>
        {showBottom && (
          <footer className="h-44 shrink-0">
            <ModuleBoundary moduleName="consola" key="consola">
              <BottomPanel />
            </ModuleBoundary>
          </footer>
        )}
      </div>
    </div>
  );
}
