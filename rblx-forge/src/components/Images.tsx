// Modo Imágenes: genera arte con FLUX.1 schnell (Cloudflare Workers AI).
// Guarda en `<proyecto>/generated-images/` y muestra la galería. Requiere
// proyecto abierto + credenciales en Configuración → Imágenes.
import { useCallback, useEffect, useState } from 'react';
import { invoke, convertFileSrc } from '@tauri-apps/api/core';
import { useProjects } from '../stores/projects';
import { clampSteps, formatBytes, imageErrorMessage, normalizeSeed, validatePrompt } from '../lib/images';
import { getCloudflareAccount, getCloudflareToken } from './CloudflareSettings';

interface GenEntry {
  name: string;
  rel: string;
  size: number;
}

export function Images() {
  const project = useProjects((s) => s.active);
  const [prompt, setPrompt] = useState('');
  const [steps, setSteps] = useState(4);
  const [seed, setSeed] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [files, setFiles] = useState<GenEntry[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  /** Resumen de la última generación: tiempo, pasos, semilla y coste reportado. */
  const [lastGen, setLastGen] = useState<{
    secs: string; steps: number; seed: string; size: number; usage: string | null;
  } | null>(null);

  const list = useCallback(async () => {
    if (!project) {
      setFiles([]);
      return;
    }
    try {
      const entries = await invoke<Array<{ name: string; rel: string; kind: string; size?: number }>>('fs_list', {
        projectDir: project.path,
        rel: 'generated-images',
      });
      const imgs = entries
        .filter((e) => e.kind !== 'dir')
        .map((e) => ({ name: e.name, rel: e.rel, size: e.size ?? 0 }))
        .sort((a, b) => (a.name < b.name ? 1 : -1));
      setFiles(imgs);
    } catch {
      setFiles([]);
    }
  }, [project]);

  useEffect(() => {
    void list();
  }, [list]);

  const generate = async () => {
    setError(null);
    const bad = validatePrompt(prompt);
    if (bad) {
      setError(bad);
      return;
    }
    if (!project) {
      setError('Abre un proyecto: las imágenes se guardan en su carpeta.');
      return;
    }
    setBusy(true);
    try {
      const [accountId, apiToken] = await Promise.all([getCloudflareAccount(), getCloudflareToken()]);
      const usedSteps = clampSteps(steps);
      const usedSeed = normalizeSeed(seed);
      const out = await invoke<{ file: string; size: number; usage?: string | null; elapsed_ms?: number }>('cf_images_generate', {
        accountId,
        apiToken,
        prompt: prompt.trim(),
        steps: usedSteps,
        seed: usedSeed ?? null,
        saveDir: project.path,
      });
      setLastGen({
        secs: out.elapsed_ms != null ? (out.elapsed_ms / 1000).toFixed(1) : '—',
        steps: usedSteps,
        seed: usedSeed != null ? String(usedSeed) : 'aleatoria',
        size: out.size,
        usage: out.usage ?? null,
      });
      setPrompt('');
      await list();
      setSelected(out.file);
    } catch (e) {
      setError(imageErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  /** Copia la imagen al portapapeles del sistema (luego Ctrl+V donde quieras,
   *  incluido el Asistente, que la recibe como [Image N]). */
  const copyImage = async (abs: string) => {
    setError(null);
    try {
      const res = await fetch(convertFileSrc(abs));
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type || 'image/png']: blob })]);
      setCopied(abs);
      setTimeout(() => setCopied((c) => (c === abs ? null : c)), 2000);
    } catch {
      setError('No se pudo copiar: el portapapeles del sistema no está disponible aquí. Usa «Al asistente».');
    }
  };

  /** Adjunta la imagen al Asistente (llega como chip [Image N] al enviar). */
  const sendToAssistant = (abs: string, name: string) => {
    const uri = 'file:///' + abs.replace(/\\/g, '/');
    document.dispatchEvent(new CustomEvent('forge:attach-image', { detail: { uri, name } }));
    document.dispatchEvent(new CustomEvent('forge:go-assistant'));
  };

  if (!project) {
    return (
      <div className="mx-auto mt-10 max-w-md rounded-xl border border-dashed border-forge-border bg-forge-panel p-6 text-center">
        <p className="font-bold">Modo Imágenes</p>
        <p className="mt-1 text-[12px] text-forge-muted">Abre un proyecto: las imágenes se guardan en su carpeta «generated-images».</p>
      </div>
    );
  }

  const selEntry = files.find((f) => `${project.path}/${f.rel}`.replace(/\\/g, '/') === (selected ?? '').replace(/\\/g, '/'));

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-forge-border-soft bg-forge-panel/70 px-3 py-2">
        <p className="font-bold">Imágenes · {project.name}</p>
        <p className="text-[11px] text-forge-muted">
          FLUX.1 schnell vía Cloudflare Workers AI · se guardan en «generated-images» del proyecto
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="card mb-3 p-3">
          <label className="mb-1 block text-[12px] text-forge-muted" htmlFor="img-prompt">
            Describe la imagen (1–2048 caracteres)
          </label>
          <textarea
            id="img-prompt"
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Un castillo flotante al atardecer, estilo low-poly de Roblox…"
            disabled={busy}
            className="input max-h-40 min-h-[64px] w-full resize-y disabled:opacity-50"
          />
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-[12px] text-forge-muted">
              Pasos
              <input
                type="range"
                min={1}
                max={8}
                value={steps}
                onChange={(e) => setSteps(clampSteps(Number(e.target.value)))}
                disabled={busy}
                className="w-28"
                title="Más pasos = más calidad y más espera (máx. 8)"
              />
              <span className="mono font-bold text-forge-text">{steps}</span>
            </label>
            <label className="flex items-center gap-2 text-[12px] text-forge-muted">
              Semilla
              <input
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                placeholder="aleatoria"
                inputMode="numeric"
                disabled={busy}
                className="input mono w-28 !py-1 !text-[12px] disabled:opacity-50"
              />
            </label>
            <button onClick={generate} disabled={busy || !prompt.trim()} className="btn btn-primary ml-auto disabled:opacity-40">
              {busy ? 'Generando…' : 'Generar imagen'}
            </button>
          </div>
          {busy && <p className="mt-2 animate-pulse text-[12px] text-forge-accent">El modelo está dibujando (puede tardar un minuto)…</p>}
          {lastGen && !busy && (
            <p className="mono mt-2 text-[11px] text-forge-muted">
              Última: {lastGen.secs} s · {lastGen.steps} pasos · semilla {lastGen.seed} · {formatBytes(lastGen.size)}
              {lastGen.usage ? ` · coste reportado: ${lastGen.usage}` : ' · la API no desglosa el coste (se descuenta de tus 10.000 Neurons/día)'}
            </p>
          )}
          {error && <p className="mt-2 text-[12px] text-forge-err">{error}</p>}
        </div>

        <div className="mb-2 flex items-center gap-2">
          <p className="text-[12px] font-bold">Galería ({files.length})</p>
          <button onClick={() => list()} className="btn btn-ghost ml-auto !py-0.5 !text-[11px]">
            Actualizar
          </button>
        </div>
        {files.length === 0 ? (
          <p className="rounded-xl border border-dashed border-forge-border bg-forge-panel p-6 text-center text-[12px] text-forge-muted">
            Aún no hay imágenes. Describe algo arriba y pulsa «Generar imagen».
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
            {files.map((f) => {
              const abs = `${project.path}/${f.rel}`;
              const src = convertFileSrc(abs);
              const isSel = selected === abs;
              return (
                <button
                  key={f.rel}
                  onClick={() => setSelected(isSel ? null : abs)}
                  title={`${f.name} (${formatBytes(f.size)}) — clic para ver`}
                  className={`overflow-hidden rounded-lg border bg-forge-panel text-left transition-colors ${isSel ? 'border-forge-accent' : 'border-forge-border hover:border-forge-accent-dim'}`}
                >
                  <img src={src} alt={f.name} className="aspect-square w-full object-cover" loading="lazy" />
                  <span className="mono block truncate px-1.5 py-1 text-[10px] text-forge-muted">{f.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setSelected(null)}>
          <div className="max-h-full max-w-3xl overflow-auto rounded-xl bg-forge-panel p-3" onClick={(e) => e.stopPropagation()}>
            <img src={convertFileSrc(selected)} alt={selEntry?.name ?? 'imagen generada'} className="max-h-[70vh] w-auto rounded-lg" />
            <div className="mono mt-2 flex flex-wrap items-center gap-2 text-[11px] text-forge-muted">
              <span className="min-w-0 flex-1 truncate">{selEntry?.name ?? selected}</span>
              {selEntry && <span className="shrink-0">{formatBytes(selEntry.size)}</span>}
              <button
                onClick={() => selEntry && copyImage(`${project.path}/${selEntry.rel}`)}
                className="btn btn-ghost shrink-0 !py-0.5 !text-[11px]"
                title="Copia al portapapeles: luego Ctrl+V en el Asistente (llega como [Image N]) o en otra app"
              >
                {copied === (selEntry && `${project.path}/${selEntry.rel}`) ? '¡Copiada!' : 'Copiar'}
              </button>
              <button
                onClick={() => selEntry && sendToAssistant(`${project.path}/${selEntry.rel}`, selEntry.name)}
                className="btn btn-ghost shrink-0 !py-0.5 !text-[11px]"
                title="Adjunta esta imagen al Asistente"
              >
                Al asistente →
              </button>
              <button onClick={() => setSelected(null)} className="btn btn-ghost shrink-0 !py-0.5 !text-[11px]">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
