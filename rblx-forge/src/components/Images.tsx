// Modo Imágenes: genera arte con Cloudflare (FLUX.1 schnell) o Google
// (Nano Banana) y guarda en `<proyecto>/generated-images/` con galería.
// Requiere proyecto abierto + claves en Configuración → Imágenes.
import { useCallback, useEffect, useRef, useState } from 'react';
import { invoke, convertFileSrc } from '@tauri-apps/api/core';
import { useProjects } from '../stores/projects';
import {
  IMAGE_MODELS, PROVIDER_LABEL, calibratedSchnellEstimate, clampSteps, dynamicCostHint,
  formatBytes, imageErrorMessage, normalizeSeed, validatePrompt,
  type ImageModelOption,
} from '../lib/images';
import { getSetting, setSetting } from '../lib/paths';
import { getCloudflareAccount, getCloudflareToken, getGoogleKey } from './CloudflareSettings';

const KEY_MEASURED_SCHNELL = 'images.measured.schnell';
const FLUX_ID = '@cf/black-forest-labs/flux-1-schnell';

interface GenEntry {
  name: string;
  rel: string;
  size: number;
}

interface LastGen {
  secs: string;
  label: string;
  size: number;
  cost: string;
}

function costHint(m: ImageModelOption, steps: number, measured: number | null): string {
  return dynamicCostHint(m, steps, measured);
}

export function Images() {
  const project = useProjects((s) => s.active);
  const [modelId, setModelId] = useState<string>(FLUX_ID);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const [prompt, setPrompt] = useState('');
  const [negative, setNegative] = useState('');
  const [steps, setSteps] = useState(4);
  const [seed, setSeed] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [files, setFiles] = useState<GenEntry[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [lastGen, setLastGen] = useState<LastGen | null>(null);
  const [measured, setMeasured] = useState<number | null>(null);
  const [calInput, setCalInput] = useState('');

  const model = IMAGE_MODELS.find((m) => m.model === modelId) ?? IMAGE_MODELS[0];
  const isCf = model.provider === 'cloudflare';

  useEffect(() => {
    getSetting(KEY_MEASURED_SCHNELL)
      .then((v) => {
        const n = Number(v);
        if (Number.isFinite(n) && n > 0) setMeasured(n);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!pickerOpen) return;
    const onDown = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPickerOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [pickerOpen]);

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

  const saveCalibration = async () => {
    const n = Math.floor(Number(calInput.replace(',', '.')));
    if (!Number.isFinite(n) || n <= 0 || n > 100000) {
      setError('Pon los Neurons que marcó tu panel (un número, p. ej. 173).');
      return;
    }
    try {
      await setSetting(KEY_MEASURED_SCHNELL, String(n));
      setMeasured(n);
      setCalInput('');
      setError(null);
    } catch (e) {
      setError(`No se pudo guardar la calibración: ${String(e).slice(0, 160)}`);
    }
  };

  const generate = async () => {
    setError(null);
    if (!project) {
      setError('Abre un proyecto: las imágenes se guardan en su carpeta.');
      return;
    }
    const promptLimit = isCf ? 2048 : 8000;
    if (!prompt.trim()) {
      setError('Describe la imagen que quieres generar.');
      return;
    }
    if ([...prompt.trim()].length > promptLimit) {
      setError(`El prompt supera los ${promptLimit} caracteres.`);
      return;
    }
    setBusy(true);
    try {
      const bad = isCf ? validatePrompt(prompt) : null;
      if (bad) {
        setError(bad);
        setBusy(false);
        return;
      }
      if (isCf) {
        const [accountId, apiToken] = await Promise.all([getCloudflareAccount(), getCloudflareToken()]);
        const usedSteps = clampSteps(steps);
        const usedSeed = normalizeSeed(seed);
        const out = await invoke<{ file: string; size: number; usage?: string | null; elapsed_ms?: number }>('cf_images_generate', {
          accountId,
          apiToken,
          model: model.model,
          prompt: prompt.trim(),
          steps: usedSteps,
          seed: usedSeed ?? null,
          negativePrompt: model.supportsNegative && negative.trim() ? negative.trim() : null,
          saveDir: project.path,
        });
        const cost = out.usage
          ? `coste reportado: ${out.usage}`
          : `≈${Math.round(calibratedSchnellEstimate(usedSteps, measured))} Neurons${measured != null ? ' (tu medición)' : ' (fórmula oficial; calibra con tu panel)'}`;
        setLastGen({
          secs: out.elapsed_ms != null ? (out.elapsed_ms / 1000).toFixed(1) : '—',
          label: `${model.label} · ${usedSteps} pasos · semilla ${usedSeed != null ? String(usedSeed) : 'aleatoria'}`,
          size: out.size,
          cost,
        });
        setSelected(out.file);
      } else {
        const apiKey = await getGoogleKey();
        const out = await invoke<{ file: string; size: number; usage?: string | null; elapsed_ms?: number }>('google_images_generate', {
          apiKey,
          model: model.model,
          prompt: prompt.trim(),
          saveDir: project.path,
        });
        setLastGen({
          secs: out.elapsed_ms != null ? (out.elapsed_ms / 1000).toFixed(1) : '—',
          label: model.label,
          size: out.size,
          cost: out.usage ?? model.costHint.replace('≈', '≈') + ' (de pago, sin capa gratis)',
        });
        setSelected(out.file);
      }
      setPrompt('');
      await list();
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
  const providers = [...new Set(IMAGE_MODELS.map((m) => m.provider))];

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-forge-border-soft bg-forge-panel/70 px-3 py-2">
        <p className="font-bold">Imágenes · {project.name}</p>
        <p className="text-[11px] text-forge-muted">
          Cloudflare o Google · se guardan en «generated-images» del proyecto
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="card mb-3 p-3">
          <label className="mb-1 block text-[12px] text-forge-muted" htmlFor="img-prompt">
            Describe la imagen (máx. {isCf ? '2.048' : '8.000'} caracteres)
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
            <div ref={pickerRef} className="relative">
              <button
                onClick={() => setPickerOpen((v) => !v)}
                disabled={busy}
                title="Elegir modelo de imagen"
                className="flex max-w-full items-center gap-1.5 rounded-lg border border-forge-border bg-forge-panel px-2 py-1 text-left transition-colors hover:border-forge-accent-dim disabled:opacity-50"
              >
                <span className="mono min-w-0 flex-1 truncate text-[12px] font-bold text-forge-accent">
                  {model.label}
                </span>
                <span className="mono hidden shrink-0 truncate text-[10px] text-forge-faint sm:block">
                  {costHint(model, steps, model.model === FLUX_ID ? measured : null)}
                </span>
                <span className="shrink-0 text-[11px] text-forge-faint">{pickerOpen ? '▴' : '▾'}</span>
              </button>
              {pickerOpen && (
                <div className="anim-enter absolute left-0 top-full z-50 mt-1 flex max-h-[60vh] w-80 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border border-forge-border bg-forge-panel shadow-2xl">
                  <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
                    {providers.map((p) => (
                      <div key={p} className="mb-1 rounded-lg border border-forge-border-soft">
                        <p className="mono px-2 pb-0.5 pt-1.5 text-[10px] uppercase tracking-wide text-forge-faint">
                          {PROVIDER_LABEL[p]}
                        </p>
                        <div className="p-1">
                          {IMAGE_MODELS.filter((m) => m.provider === p).map((m) => {
                            const sel = m.model === modelId;
                            return (
                              <button
                                key={m.model}
                                onClick={() => {
                                  setModelId(m.model);
                                  setSteps(m.defaultSteps);
                                  setPickerOpen(false);
                                }}
                                title={`${m.model} · ${m.costHint}`}
                                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors ${sel ? 'bg-forge-accent-soft' : 'hover:bg-forge-panel2'}`}
                              >
                                <span className={`w-4 shrink-0 text-center text-[12px] ${sel ? 'text-forge-accent' : 'text-transparent'}`}>✓</span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-[12.5px] font-semibold text-forge-text">{m.label}</span>
                                  <span className="mono block truncate text-[10px] text-forge-faint">
                                    {costHint(m, steps, m.model === FLUX_ID ? measured : null)}
                                  </span>
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-forge-border-soft px-2 py-1">
                    <p className="mono text-center text-[10px] text-forge-faint">
                      Cloudflare: Neurons (10.000/día gratis) · Google: de pago, sin capa gratis
                    </p>
                  </div>
                </div>
              )}
            </div>
            {isCf && model.supportsSteps && (
              <label className="flex items-center gap-2 text-[12px] text-forge-muted">
                Pasos
                <input
                  type="range"
                  min={1}
                  max={model.maxSteps}
                  value={steps}
                  onChange={(e) => setSteps(clampSteps(Number(e.target.value), model.maxSteps, model.defaultSteps))}
                  disabled={busy}
                  className="w-28"
                  title={`Más pasos = más calidad, espera y coste (máx. ${model.maxSteps})`}
                />
                <span className="mono font-bold text-forge-text">{steps}</span>
              </label>
            )}
            {isCf && model.supportsSeed && (
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
            )}
            {isCf && model.supportsNegative && (
              <label className="flex min-w-0 flex-1 items-center gap-2 text-[12px] text-forge-muted">
                Evitar
                <input
                  value={negative}
                  onChange={(e) => setNegative(e.target.value)}
                  placeholder="lo que NO quieres ver…"
                  disabled={busy}
                  className="input min-w-0 flex-1 !py-1 !text-[12px] disabled:opacity-50"
                />
              </label>
            )}
            {!isCf && (
              <span className="text-[11px] text-forge-faint">Google fija resolución y pasos (1K por defecto).</span>
            )}
            <button onClick={generate} disabled={busy || !prompt.trim()} className="btn btn-primary ml-auto disabled:opacity-40">
              {busy ? 'Generando…' : 'Generar imagen'}
            </button>
          </div>
          {isCf && model.model === FLUX_ID && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-forge-muted">
              {measured != null ? (
                <span>
                  Calibrado con tu medición: <span className="mono font-bold text-forge-text">{measured} Neurons</span> a 4 pasos.
                  (<button onClick={() => { setMeasured(null); setCalInput(''); setSetting(KEY_MEASURED_SCHNELL, '0').catch(() => {}); }} className="underline" title="Borra la calibración y vuelve a la fórmula oficial">quitar</button>)
                </span>
              ) : (
                <>
                  <span>¿Cuánto marcó tu panel de Cloudflare la última vez?</span>
                  <input
                    value={calInput}
                    onChange={(e) => setCalInput(e.target.value)}
                    placeholder="p. ej. 173"
                    inputMode="numeric"
                    disabled={busy}
                    className="input mono w-24 !py-0.5 !text-[11px] disabled:opacity-50"
                  />
                  <button onClick={saveCalibration} disabled={busy} className="btn btn-ghost !py-0.5 !text-[11px]">
                    Guardar medición
                  </button>
                </>
              )}
            </div>
          )}
          {busy && <p className="mt-2 animate-pulse text-[12px] text-forge-accent">El modelo está dibujando (puede tardar un minuto)…</p>}
          {lastGen && !busy && (
            <p className="mono mt-2 text-[11px] text-forge-muted">
              Última ({lastGen.label}): {lastGen.secs} s · {formatBytes(lastGen.size)} · {lastGen.cost}
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
