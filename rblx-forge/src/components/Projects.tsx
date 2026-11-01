import { useEffect, useState } from 'react';
import { useProjects, DEFAULT_PARENT } from '../stores/projects';
import { getProjectsParent, pickDirectory } from '../lib/paths';
import { StudioPanel } from './Studio';
import { invoke } from '@tauri-apps/api/core';

export function Projects({ onOpenProject }: { onOpenProject: (dir: string) => void }) {
  const { recents, active, busy, error, refreshRecents, clearError } = useProjects();
  const [q, setQ] = useState('');
  const [showWizard, setShowWizard] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const st = useProjects.getState();

  useEffect(() => {
    refreshRecents().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = recents.filter(
    (r) => !q || r.name.toLowerCase().includes(q.toLowerCase()) || r.path.toLowerCase().includes(q.toLowerCase()),
  );
  const sorted = [...filtered].sort((a, b) => Number(b.favorite) - Number(a.favorite));

  return (
    <div className="flex h-full">
      <div className="flex w-72 flex-col border-r border-forge-border bg-forge-panel">
        <div className="flex gap-1 p-2">
          <button onClick={() => setShowWizard(true)} className="flex-1 rounded bg-forge-accent px-2 py-1 text-[12px] font-bold text-black">
            + Nuevo
          </button>
          <button onClick={() => setShowImport(true)} className="flex-1 rounded border border-forge-border px-2 py-1 text-[12px] hover:text-forge-accent">
            Importar Rojo
          </button>
        </div>
        <div className="px-2 pb-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar proyectos…" className="w-full rounded border border-forge-border bg-forge-bg px-2 py-1 text-[12px] outline-none placeholder:text-forge-muted focus:border-forge-accent-dim" />
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {sorted.length === 0 && (
            <div className="rounded-xl border border-dashed border-forge-border p-4 text-center text-[12px] text-forge-faint">
              Sin proyectos todavía.<br />Crea el primero con «+ Nuevo» o importa uno Rojo.
            </div>
          )}
          {sorted.map((r) => (
            <div key={r.path} className={`card card-hover anim-fade mb-2 !p-2.5 ${r.path === active?.path ? '!border-forge-accent-dim' : ''}`}>
              <div className="flex items-center gap-1">
                <button onClick={() => { onOpenProject(r.path); }} className="min-w-0 flex-1 truncate text-left text-[13px] font-bold hover:text-forge-accent" title={r.path}>
                  {r.favorite ? <span className="mr-1 text-forge-accent">★</span> : null}{r.name}
                </button>
                <button onClick={() => st.toggleFavorite(r.path)} title="Favorito" className={`text-[14px] ${r.favorite ? 'text-forge-accent' : 'text-forge-faint hover:text-forge-text'}`}>★</button>
              </div>
              <div className="mono mt-0.5 truncate text-[10px] text-forge-faint" title={r.path}>{r.path}</div>
              <div className="mt-1.5 flex items-center gap-1.5">
                {r.has_rojo ? <span className="pill pill-ok">Rojo</span> : <span className="pill pill-neutral">sin Rojo</span>}
                {r.has_git && <span className="pill pill-neutral">git</span>}
                {!r.has_forge_file && <span className="pill pill-warn">externo</span>}
                <button onClick={() => setPendingDelete(r.path)} className="ml-auto text-[11px] text-forge-faint hover:text-forge-err">Eliminar…</button>
              </div>
            </div>
          ))}
        </div>
        {error && (
          <div className="border-t border-forge-err p-2 text-[12px] text-forge-err">
            {error} <button onClick={clearError} className="ml-2 underline">cerrar</button>
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1 p-3">
        <ProjectDetail onOpenProject={onOpenProject} />
      </div>
      {showWizard && <CreateWizard onClose={() => setShowWizard(false)} />}
      {showImport && <ImportDialog onClose={() => setShowImport(false)} />}
      {pendingDelete && <DeleteConfirm path={pendingDelete} onClose={() => setPendingDelete(null)} />}
      {busy && <div className="pointer-events-none fixed bottom-4 right-4 rounded bg-forge-panel2 px-3 py-1 text-[12px] text-forge-accent">Trabajando…</div>}
    </div>
  );
}

function ProjectDetail({ onOpenProject }: { onOpenProject: (dir: string) => void }) {
  const { active, rojo, checkRojo } = useProjects();
  const [repairMsg, setRepairMsg] = useState<string | null>(null);
  const [repairing, setRepairing] = useState(false);
  if (!active) return <p className="text-forge-muted">Selecciona o crea un proyecto para ver su detalle.</p>;
  const isRojo = !!rojo?.has_file;
  const repair = async () => {
    setRepairMsg(null);
    setRepairing(true);
    try {
      const created = await invoke<string[]>('rojo_repair', { projectDir: active.path });
      setRepairMsg(created.length ? `Creadas: ${created.join(', ')}` : 'Nada que crear: estructura completa.');
      await checkRojo();
    } catch (e) {
      setRepairMsg(String(e));
    } finally {
      setRepairing(false);
    }
  };
  return (
    <div className="max-w-2xl">
      <h2 className="text-base font-bold">{active.name}</h2>
      <p className="mono mb-2 break-all text-[11px] text-forge-muted">{active.path}</p>
      <div className="mb-2 flex gap-2 text-[12px]">
        <button onClick={() => onOpenProject(active.path)} className="rounded bg-forge-accent px-2 py-1 font-bold text-black">Abrir</button>
        <button onClick={() => checkRojo()} className="rounded border border-forge-border px-2 py-1 hover:text-forge-accent">Revalidar Rojo</button>
      </div>
      <div className="mb-2 rounded border border-forge-border bg-forge-panel p-2 text-[12px]">
        <p className="mb-1 font-bold text-forge-muted">ROJO</p>
        {!rojo && <p className="text-forge-muted">Sin comprobar.</p>}
        {rojo && !rojo.has_file && (
          <p className="text-forge-muted">
            Este proyecto no usa Rojo (sin <span className="mono">default.project.json</span>): edita los .luau aquí
            y cópialos a mano en Studio. Las secciones de serve/build/jerarquía no aplican.
          </p>
        )}
        {rojo && rojo.has_file && (
          <>
            <p>Proyecto: <span className="mono">{rojo.name}</span> · {rojo.valid ? <span className="text-forge-ok">válido</span> : <span className="text-forge-err">con errores</span>}</p>
            {rojo.error && <p className="text-forge-err">{rojo.error}</p>}
            {rojo.missing_paths.length > 0 && (
              <>
                <ul className="mono mt-1 list-disc pl-4 text-forge-err">{rojo.missing_paths.map((m) => <li key={m}>{m}</li>)}</ul>
                <button onClick={repair} disabled={repairing} className="btn btn-ghost mt-1">
                  {repairing ? 'Reparando…' : 'Reparar estructura (crear carpetas ausentes)'}
                </button>
              </>
            )}
            {repairMsg && <p className="mt-1 text-forge-muted">{repairMsg}</p>}
            <p className="mt-1 text-forge-muted">Binario: {rojo.binary ? `${rojo.binary.version} (${rojo.binary.path})` : 'no detectado (se busca en PATH, ajuste toolchain.rojo y tools/ del entorno)'}</p>
          </>
        )}
      </div>
      {isRojo && <RojoServe projectDir={active.path} />}
      <div className="mb-2"><StudioPanel projectDir={active.path} /></div>
      {isRojo && <RojoTree projectDir={active.path} />}
    </div>
  );
}

function useRojoServe(projectDir: string) {
  const [status, setStatus] = useState<{ running: boolean; pid?: number; port?: number; url?: string; alive: boolean }>({ running: false, alive: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refresh = async () => {
    try {
      setStatus(await invoke('rojo_serve_status'));
    } catch (e) {
      setError(String(e));
    }
  };
  useEffect(() => {
    refresh().catch(() => {});
    const t = setInterval(refresh, 3000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectDir]);
  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      setStatus(await invoke('rojo_serve_start', { projectDir }));
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };
  const stop = async () => {
    setBusy(true);
    try {
      await invoke('rojo_serve_stop');
      await refresh();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };
  return { status, busy, error, start, stop, refresh };
}

function RojoServe({ projectDir }: { projectDir: string }) {
  const { status, busy, error, start, stop } = useRojoServe(projectDir);
  const [buildOut, setBuildOut] = useState<string | null>(null);
  const build = async () => {
    setBuildOut('construyendo…');
    try {
      const r = await invoke<{ success: boolean; exit_code?: number; stdout: string; stderr: string; output: string }>('rojo_build', { projectDir, output: null });
      setBuildOut(`${r.success ? 'OK' : 'FALLO'} (exit ${r.exit_code ?? '?'}) → ${r.output}\n${r.stdout.slice(0, 800)}\n${r.stderr.slice(0, 800)}`);
    } catch (e) {
      setBuildOut(`Error: ${String(e)}`);
    }
  };
  return (
    <div className="mb-2 rounded border border-forge-border bg-forge-panel p-2 text-[12px]">
      <p className="mb-1 font-bold text-forge-muted">ROJO SERVE / BUILD</p>
      <p>
        Estado: {status.running ? (status.alive ? <span className="text-forge-ok">● sirviendo {status.url} (pid {status.pid})</span> : <span className="text-forge-err">● proceso sin puerto</span>) : <span className="text-forge-muted">○ detenido</span>}
      </p>
      <div className="mt-1 flex gap-2">
        {!status.running ? (
          <button onClick={start} disabled={busy} className="rounded border border-forge-accent-dim px-2 py-0.5 text-forge-accent disabled:opacity-50">Iniciar serve</button>
        ) : (
          <button onClick={stop} disabled={busy} className="rounded border border-forge-err px-2 py-0.5 text-forge-err disabled:opacity-50">Detener</button>
        )}
        <button onClick={build} className="rounded border border-forge-border px-2 py-0.5">rojo build → game.rbxlx</button>
      </div>
      {error && <p className="mt-1 text-forge-err">{String(error).slice(0, 300)}</p>}
      {buildOut && <pre className="mono mt-1 max-h-32 overflow-auto whitespace-pre-wrap text-[11px] text-forge-muted">{buildOut}</pre>}
      <p className="mt-1 text-[11px] text-forge-muted">Requiere el plugin Rojo en Studio para sincronizar. Sin plugin, `serve` expone el proyecto pero Studio no lo aplica.</p>
    </div>
  );
}

interface TreeNode { name: string; class: string; rel?: string; children: TreeNode[] }

function TreeItem({ node, depth }: { node: TreeNode; depth: number }) {
  const [open, setOpen] = useState(depth < 2);
  const icon = node.children.length ? (open ? '▾' : '▸') : '·';
  const cls = node.class === '⚠' ? 'text-forge-err' : node.class === 'Folder' ? 'text-forge-accent' : 'text-forge-text';
  return (
    <div>
      <button onClick={() => setOpen((v) => !v)} className={`block w-full truncate text-left text-[12px] ${cls}`} style={{ paddingLeft: depth * 12 }} title={node.rel ?? node.name}>
        <span className="mr-1 text-forge-muted">{icon}</span>[{node.class}] {node.name}
      </button>
      {open && node.children.map((c, i) => <TreeItem key={i} node={c} depth={depth + 1} />)}
    </div>
  );
}

function RojoTree({ projectDir }: { projectDir: string }) {
  const [tree, setTree] = useState<TreeNode[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    invoke<TreeNode[]>('rojo_tree', { projectDir }).then(setTree).catch((e) => setError(String(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectDir]);
  return (
    <div className="rounded border border-forge-border bg-forge-panel p-2">
      <p className="mb-1 text-[12px] font-bold text-forge-muted">JERARQUÍA (proyecto Rojo — la que Rojo sincroniza, no lectura en vivo de Studio)</p>
      {error && <p className="text-[12px] text-forge-err">{error}</p>}
      {tree && tree.map((n, i) => <TreeItem key={i} node={n} depth={0} />)}
    </div>
  );
}

function CreateWizard({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('Mi Juego');
  const [parent, setParent] = useState(DEFAULT_PARENT);
  const [template, setTemplate] = useState('base-rojo');
  const [git, setGit] = useState(true);
  const st = useProjects.getState();
  const busy = useProjects((s) => s.busy);

  useEffect(() => {
    getProjectsParent().then((p) => { if (p) setParent(p); }).catch(() => {});
  }, []);

  const submit = async () => {
    await st.create(name.trim(), parent.trim(), template, git);
    if (!useProjects.getState().error) onClose();
  };

  return (
    <Modal title="Nuevo proyecto" onClose={onClose}>
      <label className="mb-2 block text-[12px]">Nombre
        <input value={name} onChange={(e) => setName(e.target.value)} className="mt-0.5 w-full rounded border border-forge-border bg-forge-bg px-2 py-1" />
      </label>
      <div className="mb-2 text-[12px]">Carpeta donde crear el juego
        <div className="mt-0.5 flex gap-1">
          <input value={parent} onChange={(e) => setParent(e.target.value)} placeholder="Configúrala en Configuración o elígela aquí" className="mono min-w-0 flex-1 rounded border border-forge-border bg-forge-bg px-2 py-1 text-[11px]" />
          <button onClick={async () => {
            try {
              const sel = await pickDirectory('Carpeta donde crear el juego');
              if (sel) setParent(sel);
            } catch { /* el usuario cancela: sin ruido */ }
          }} className="btn btn-ghost shrink-0 !px-2">…</button>
        </div>
      </div>
      <label className="mb-2 block text-[12px]">Plantilla
        <select value={template} onChange={(e) => setTemplate(e.target.value)} className="mt-0.5 w-full rounded border border-forge-border bg-forge-bg px-2 py-1">
          <option value="base-rojo">base-rojo — Rojo + Studio: bootstrap servidor/cliente, config, spec de humo, stylua/selene</option>
          <option value="vacio">vacio — Rojo mínimo: proyecto sincronizado sin código inicial</option>
          <option value="simple">simple — SIN Rojo: scripts para copiar a mano en Studio</option>
        </select>
      </label>
      <label className="mb-3 flex items-center gap-2 text-[12px]">
        <input type="checkbox" checked={git} onChange={(e) => setGit(e.target.checked)} /> Inicializar git (requiere git en PATH)
      </label>
      <div className="text-right">
        <button onClick={submit} disabled={busy || !name.trim()} className="rounded bg-forge-accent px-3 py-1 font-bold text-black disabled:opacity-50">Crear</button>
      </div>
    </Modal>
  );
}

function ImportDialog({ onClose }: { onClose: () => void }) {
  const [path, setPath] = useState('');
  const st = useProjects.getState();
  const submit = async () => {
    await st.importRojo(path.trim());
    if (!useProjects.getState().error) onClose();
  };
  return (
    <Modal title="Importar proyecto Rojo" onClose={onClose}>
      <p className="mb-2 text-[12px] text-forge-muted">Carpeta que contenga un <span className="mono">default.project.json</span> válido. Solo lectura + registro; no se modifica nada.</p>
      <div className="mb-2 flex gap-1">
        <input value={path} onChange={(e) => setPath(e.target.value)} placeholder="Elige la carpeta del juego" className="mono min-w-0 flex-1 rounded border border-forge-border bg-forge-bg px-2 py-1 text-[11px]" />
        <button onClick={async () => {
          try {
            const sel = await pickDirectory('Carpeta del proyecto Rojo a importar');
            if (sel) setPath(sel);
          } catch { /* cancelado */ }
        }} className="btn btn-ghost shrink-0 !px-2">…</button>
      </div>
      <div className="text-right">
        <button onClick={submit} disabled={!path.trim()} className="rounded bg-forge-accent px-3 py-1 font-bold text-black disabled:opacity-50">Importar</button>
      </div>
    </Modal>
  );
}

function DeleteConfirm({ path, onClose }: { path: string; onClose: () => void }) {
  const [ack, setAck] = useState(false);
  const st = useProjects.getState();
  const submit = async () => {
    await st.remove(path);
    if (!useProjects.getState().error) onClose();
  };
  return (
    <Modal title="Eliminar proyecto" onClose={onClose}>
      <p className="mb-1 text-[12px]">Se eliminará del disco (solo proyectos con <span className="mono">forge.project.json</span>):</p>
      <p className="mono mb-2 break-all text-[11px] text-forge-err">{path}</p>
      <label className="mb-3 flex items-center gap-2 text-[12px]">
        <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} /> Entiendo que es irreversible
      </label>
      <div className="text-right">
        <button onClick={submit} disabled={!ack} className="rounded border border-forge-err px-3 py-1 text-forge-err disabled:opacity-50">Eliminar definitivamente</button>
      </div>
    </Modal>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="w-[480px] max-w-[90vw] rounded border border-forge-border bg-forge-panel p-3" onClick={(e) => e.stopPropagation()}>
        <div className="mb-2 flex items-center">
          <p className="font-bold">{title}</p>
          <button onClick={onClose} className="ml-auto text-forge-muted hover:text-forge-text">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
