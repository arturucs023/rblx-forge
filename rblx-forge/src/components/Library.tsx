import { useEffect, useState } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';
import { invoke } from '@tauri-apps/api/core';
import { REFERENCES, CATEGORIES, type RefItem } from '../assets/references-index';
import { useSessions } from '../stores/sessions';

import { getWorkspaceDir } from './panels';

const DEFAULT_REFS = '';

async function getRefsDir(): Promise<string> {
  try {
    const v = await invoke<string | null>('settings_get', { key: 'paths.references' });
    if (typeof v === 'string' && v.trim()) return v.trim();
  } catch { /* sin ajuste: deriva del workspace */ }
  const ws = await getWorkspaceDir().catch(() => '');
  return ws ? ws.replace(/\/$/, '') + '/references' : '';
}

// Galería sobre archivos REALES del disco (asset:// vía convertFileSrc).
// No hay análisis de imagen por IA: si el modelo activo de OpenCode tiene
// visión, el botón copia la ruta para referenciarla en el Asistente.
export function Library() {
  const [base, setBase] = useState(DEFAULT_REFS);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string>('todas');
  const [sel, setSel] = useState<RefItem | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [favs, setFavs] = useState<string[]>([]);

  useEffect(() => {
    getRefsDir().then(setBase).catch(() => {});
    invoke<string[] | null>('settings_get', { key: 'library.favorites' })
      .then((v) => { if (Array.isArray(v)) setFavs(v); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!base) { setMissing([]); return; }
    // Verificar existencia real de cada archivo (sin asumir).
    (async () => {
      const miss: string[] = [];
      for (const r of REFERENCES) {
        try {
          await invoke('fs_read', { projectDir: base, rel: r.file });
        } catch {
          // fs_read falla también por tamaño/contenido; comprobar existencia aparte
          try {
            await invoke('fs_list', { projectDir: base, rel: r.file.split('/').slice(0, -1).join('/') || '.' });
          } catch {
            miss.push(r.file);
          }
        }
      }
      setMissing(miss);
    })();
  }, [base]);

  const toggleFav = async (f: string) => {
    const next = favs.includes(f) ? favs.filter((x) => x !== f) : [...favs, f];
    setFavs(next);
    try {
      await invoke('settings_set', { key: 'library.favorites', value: next });
    } catch { /* persistencia best-effort */ }
  };

  const sendToAssistant = (r: RefItem) => {
    useSessions.getState().setAssistantDraft(`Referencia visual del proyecto (ruta local, NO analizada por IA salvo que el modelo tenga visión): ${base}\\${r.file}\n${r.description}\nLicencia: ${r.license} · Autor: ${r.author}`);
    document.dispatchEvent(new CustomEvent('forge:go-assistant'));
  };

  const filtered = REFERENCES.filter(
    (r) => (cat === 'todas' || r.category === cat) && (!q || (r.description + r.tags.join(' ') + r.file).toLowerCase().includes(q.toLowerCase())),
  );

  if (!base) {
    return (
      <div className="mx-auto max-w-md p-6 text-center">
        <div className="card anim-enter p-5">
          <p className="font-bold">Biblioteca sin carpeta asignada</p>
          <p className="mt-1 text-[12px] text-forge-muted">Configura tu workspace (o la ruta <span className="mono">paths.references</span>) en Configuración para ver las imágenes locales.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <div className="min-w-0 flex-1 overflow-auto p-3">
        <div className="mb-2 flex flex-wrap items-center gap-1 text-[12px]">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" className="rounded border border-forge-border bg-forge-bg px-2 py-1 outline-none placeholder:text-forge-muted" />
          <select value={cat} onChange={(e) => setCat(e.target.value)} className="rounded border border-forge-border bg-forge-bg px-2 py-1">
            <option value="todas">Todas ({REFERENCES.length})</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <span className="mono ml-auto truncate text-[10px] text-forge-muted" title={base}>{base}</span>
        </div>
        {missing.length > 0 && (
          <p className="mb-2 rounded border border-forge-warn p-2 text-[12px] text-forge-warn">
            No encontrados en disco ({missing.length}): {missing.slice(0, 4).join(', ')}{missing.length > 4 ? '…' : ''}. Revisa la ruta base en Configuración → paths.references.
          </p>
        )}
        <div className="grid grid-cols-2 gap-2 xl:grid-cols-3">
          {filtered.map((r) => (
            <button key={r.file} onClick={() => setSel(r)} className="card card-hover anim-fade overflow-hidden p-0 text-left">
              <div className="aspect-video w-full overflow-hidden bg-forge-bg">
                <img src={convertFileSrc(`${base}\\${r.file}`)} alt={r.description} loading="lazy" className="h-full w-full object-cover transition-transform duration-200 hover:scale-[1.03]" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              </div>
              <div className="p-2 text-[11px]">
                <span className="pill pill-neutral">{r.category}</span>
                <p className="mt-1 leading-snug text-forge-text">{r.description.slice(0, 70)}</p>
                {favs.includes(r.file) && <span className="text-forge-accent">★ favorita</span>}
              </div>
            </button>
          ))}
        </div>
        {filtered.length === 0 && <p className="text-forge-muted">Sin resultados.</p>}
      </div>
      <div className="w-80 shrink-0 overflow-auto border-l border-forge-border bg-forge-panel p-3">
        {!sel && <p className="text-[12px] text-forge-muted">Selecciona una referencia para ver metadatos, licencia y acciones.</p>}
        {sel && (
          <div className="text-[12px]">
            <img src={convertFileSrc(`${base}\\${sel.file}`)} alt={sel.description} className="mb-2 w-full rounded" />
            <p className="font-bold">{sel.category}</p>
            <p className="mb-1">{sel.description}</p>
            <p><span className="text-forge-muted">Archivo:</span> <span className="mono text-[11px]">{sel.file}</span></p>
            <p><span className="text-forge-muted">Autor:</span> {sel.author}</p>
            <p><span className="text-forge-muted">Licencia:</span> {sel.license}</p>
            <p><span className="text-forge-muted">Etiquetas:</span> {sel.tags.join(', ')}</p>
            <p className="mt-1"><button className="text-forge-accent underline" onClick={() => openUrl(sel.source)}>Fuente original ↗</button></p>
            <div className="mt-2 flex gap-1">
              <button onClick={() => toggleFav(sel.file)} className="rounded border border-forge-border px-2 py-0.5">{favs.includes(sel.file) ? '★ Favorita' : '☆ Favorita'}</button>
              <button onClick={() => sendToAssistant(sel)} className="rounded border border-forge-accent-dim px-2 py-0.5 text-forge-accent" title="Copia la ruta al Asistente (referencia por ruta, no análisis)">Usar en Asistente →</button>
            </div>
            <p className="mt-2 text-[11px] text-forge-muted">Forge no afirma que OpenCode haya analizado la imagen: solo envía su ruta y metadatos. El análisis visual real depende del modelo activo.</p>
          </div>
        )}
      </div>
    </div>
  );
}
