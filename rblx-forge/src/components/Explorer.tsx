import { useState } from 'react';
import { useProjects } from '../stores/projects';
import { useEditor } from '../stores/editor';

export function Explorer() {
  const { active, tree, searchHits, error, clearError } = useProjects();
  const [q, setQ] = useState('');
  const [newName, setNewName] = useState('');
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameTo, setRenameTo] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const st = useProjects.getState();

  if (!active) return <p className="p-3 text-forge-muted">Abre un proyecto para explorar sus archivos.</p>;

  const doSearch = () => {
    if (q.trim().length >= 2) st.search(q.trim());
  };

  const createHere = (kind: 'file' | 'dir') => {
    const n = newName.trim();
    if (!n) return;
    if (kind === 'dir') st.mkdir(n);
    else st.writeFile(n, '');
    setNewName('');
  };

  return (
    <div className="flex h-full">
      <div className="flex w-72 flex-col border-r border-forge-border bg-forge-panel">
        <div className="p-2">
          <div className="mb-1 flex gap-1">
            <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && doSearch()} placeholder="Buscar (≥2 letras)…" className="min-w-0 flex-1 rounded border border-forge-border bg-forge-bg px-2 py-1 text-[12px] outline-none placeholder:text-forge-muted" />
            <button onClick={doSearch} className="rounded border border-forge-border px-2 text-[12px]">⌕</button>
          </div>
          <div className="flex gap-1">
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="ruta/nombre…" className="mono min-w-0 flex-1 rounded border border-forge-border bg-forge-bg px-2 py-1 text-[11px] outline-none placeholder:text-forge-muted" />
            <button onClick={() => createHere('file')} title="Crear archivo" className="rounded border border-forge-border px-2 text-[12px]">+📄</button>
            <button onClick={() => createHere('dir')} title="Crear carpeta" className="rounded border border-forge-border px-2 text-[12px]">+📁</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {tree.map((e) => (
            <div key={e.rel} className="group flex items-center gap-1 rounded px-1 py-0.5 text-[12px] hover:bg-forge-panel2">
              <button
                onClick={() => (e.kind === 'dir' ? st.loadTree(e.rel) : st.previewFile(e.rel))}
                className="min-w-0 flex-1 truncate text-left"
                title={e.rel}
              >
                {e.kind === 'dir' ? '📁' : '📄'} {e.name}
              </button>
              <button onClick={() => { setRenaming(e.rel); setRenameTo(e.rel); }} className="hidden text-forge-muted hover:text-forge-text group-hover:inline" title="Renombrar">✎</button>
              <button onClick={() => setDeleting(e.rel)} className="hidden text-forge-muted hover:text-forge-err group-hover:inline" title="Eliminar">🗑</button>
            </div>
          ))}
          {searchHits.length > 0 && (
            <div className="mt-2 border-t border-forge-border pt-1">
              <p className="px-1 text-[11px] font-bold text-forge-muted">RESULTADOS ({searchHits.length})</p>
              {searchHits.map((h, i) => (
                <button key={i} onClick={() => st.previewFile(h.rel)} className="block w-full truncate px-1 text-left text-[11px] hover:text-forge-accent" title={h.snippet}>
                  <span className="mono">{h.rel}:{h.line}</span> — {h.snippet.slice(0, 60)}
                </button>
              ))}
            </div>
          )}
        </div>
        {error && <div className="border-t border-forge-err p-2 text-[12px] text-forge-err">{error} <button onClick={clearError} className="ml-2 underline">cerrar</button></div>}
      </div>
      <Preview />
      {renaming && <RenameDialog from={renaming} initial={renameTo} onClose={() => setRenaming(null)} />}
      {deleting && <DeleteEntryConfirm rel={deleting} onClose={() => setDeleting(null)} />}
    </div>
  );
}

function Preview() {
  const { preview } = useProjects();
  const openInEditor = useEditor((s) => s.openFile);
  const [draft, setDraft] = useState<string | null>(null);
  const st = useProjects.getState();
  if (!preview) return <p className="p-3 text-forge-muted">Selecciona un archivo para previsualizarlo (solo lectura hasta el Editor FASE 5).</p>;
  const text = draft ?? preview.content;
  const dirty = draft !== null && draft !== preview.content;
  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-forge-border px-3 py-1">
        <span className="mono truncate text-[12px]">{preview.rel}</span>
        <button onClick={() => openInEditor(preview.rel, preview.content)} className="rounded border border-forge-accent-dim px-2 py-0.5 text-[12px] text-forge-accent">
          Abrir en editor
        </button>
        {dirty && (
          <button onClick={() => { st.writeFile(preview.rel, text); setDraft(null); }} className="rounded bg-forge-accent px-2 py-0.5 text-[12px] font-bold text-black">
            Guardar
          </button>
        )}
      </div>
      <textarea value={text} onChange={(e) => setDraft(e.target.value)} spellCheck={false} className="mono min-h-0 flex-1 resize-none bg-forge-bg p-3 text-[12px] outline-none" />
    </div>
  );
}

function RenameDialog({ from, initial, onClose }: { from: string; initial: string; onClose: () => void }) {
  const [to, setTo] = useState(initial);
  const st = useProjects.getState();
  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="w-[420px] rounded border border-forge-border bg-forge-panel p-3" onClick={(e) => e.stopPropagation()}>
        <p className="mb-2 font-bold">Renombrar</p>
        <input value={to} onChange={(e) => setTo(e.target.value)} className="mono mb-2 w-full rounded border border-forge-border bg-forge-bg px-2 py-1 text-[11px]" />
        <div className="text-right">
          <button onClick={async () => { await st.renameEntry(from, to.trim()); onClose(); }} disabled={!to.trim() || to === from} className="rounded bg-forge-accent px-3 py-1 text-[12px] font-bold text-black disabled:opacity-50">Renombrar</button>
        </div>
      </div>
    </div>
  );
}

function DeleteEntryConfirm({ rel, onClose }: { rel: string; onClose: () => void }) {
  const [ack, setAck] = useState(false);
  const st = useProjects.getState();
  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="w-[420px] rounded border border-forge-border bg-forge-panel p-3" onClick={(e) => e.stopPropagation()}>
        <p className="mb-1 font-bold">Eliminar</p>
        <p className="mono mb-2 break-all text-[11px] text-forge-err">{rel}</p>
        <label className="mb-2 flex items-center gap-2 text-[12px]"><input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} /> Confirmo la eliminación</label>
        <div className="text-right">
          <button onClick={async () => { await st.deleteEntry(rel); onClose(); }} disabled={!ack} className="rounded border border-forge-err px-3 py-1 text-[12px] text-forge-err disabled:opacity-50">Eliminar</button>
        </div>
      </div>
    </div>
  );
}
