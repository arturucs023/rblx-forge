// Composer: textarea auto-ajustable, Enter envía / Shift+Enter salta línea,
// adjuntos reales (file://, verificados 200 contra el servidor), selector de
// modelo, enviar/detener. Sin botones decorativos: todo funciona.
import { useEffect, useRef, useState, type ClipboardEvent } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { ModelSelect } from './ModelSelect';
import type { ModelValue } from '../ModelPicker';
import { isImageChipName, pastedImageName } from '../../lib/images';

export interface OutgoingFiles {
  uri: string;
  name: string;
}

function fileNameOf(path: string): string {
  const parts = path.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] || path;
}

export function Composer({
  draft,
  setDraft,
  onSend,
  busy,
  streaming,
  onInterrupt,
  disabled,
  placeholder,
  modelValue,
  onModelChange,
  modelsReady,
}: {
  draft: string;
  setDraft: (s: string) => void;
  onSend: (text: string, files: OutgoingFiles[]) => void;
  busy: boolean;
  streaming: boolean;
  onInterrupt: () => void;
  disabled: boolean;
  placeholder: string;
  modelValue: ModelValue | null;
  onModelChange: (v: ModelValue | null) => void;
  modelsReady: boolean;
}) {
  const [files, setFiles] = useState<OutgoingFiles[]>([]);
  const [attachError, setAttachError] = useState<string | null>(null);
  /** Pegados largos colapsados estilo OpenCode: el draft lleva el marcador
   *  `[Pasted ~N lines]` y el texto real vive aquí hasta el envío. */
  const [snippets, setSnippets] = useState<Array<{ marker: string; text: string; expanded: boolean }>>([]);
  const snipSeq = useRef(0);
  /** Contador de imágenes del mensaje ([Image 1], [Image 2]… estilo OpenCode). */
  const imgSeq = useRef(0);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Adjuntos desde otros módulos (galería de Imágenes, Referencias):
  // detail {uri: 'file:///...', name}. Persisten hasta enviar.
  useEffect(() => {
    const onAttach = (ev: Event) => {
      const d = (ev as CustomEvent<{ uri?: string; name?: string }>).detail;
      const uri: string | undefined = d?.uri;
      if (!uri) return;
      const name: string = d.name || fileNameOf(uri);
      setAttachError(null);
      setFiles((prev) => {
        if (prev.some((f) => f.uri === uri) || prev.length >= 10) return prev;
        const next: OutgoingFiles[] = [...prev, { uri, name }];
        return next;
      });
    };
    document.addEventListener('forge:attach-image', onAttach);
    return () => document.removeEventListener('forge:attach-image', onAttach);
  }, []);

  // Si el usuario borra el marcador a mano, el chip huérfano desaparece.
  useEffect(() => {
    setSnippets((prev) => (prev.length && !prev.some((s) => draft.includes(s.marker)) ? [] : prev.filter((s) => draft.includes(s.marker))));
  }, [draft]);

  // Auto-resize con tope.
  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }, [draft]);

  const pickFiles = async () => {
    setAttachError(null);
    try {
      const sel = await open({ multiple: true, title: 'Adjuntar archivos al mensaje' });
      if (!sel) return;
      const paths = (Array.isArray(sel) ? sel : [sel]).filter((p): p is string => typeof p === 'string');
      const next = paths.map((p) => ({
        uri: 'file:///' + p.replace(/\\/g, '/'),
        name: fileNameOf(p),
      }));
      setFiles((prev) => [...prev, ...next].slice(0, 10));
    } catch (e) {
      setAttachError(`No se pudo abrir el selector: ${String(e).slice(0, 120)}`);
    }
  };

  const canSend = !disabled && !busy && !streaming && (!!draft.trim() || files.length > 0);

  /** Base64 por trozos (evita el límite de pila de btoa con blobs grandes). */
  function blobToBase64(blob: Blob): Promise<string> {
    return blob.arrayBuffer().then((buf) => {
      const bytes = new Uint8Array(buf);
      let s = '';
      for (let i = 0; i < bytes.length; i += 0x8000) {
        s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      }
      return btoa(s);
    });
  }

  function extOf(mime: string): string {
    if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
    if (mime.includes('webp')) return 'webp';
    if (mime.includes('gif')) return 'gif';
    return 'png';
  }

  /** Pegar imágenes (Ctrl+V) → chips [Image 1], [Image 2]… como OpenCode.
   *  El binario se guarda en el temporal vía backend y viaja como file://. */
  const pasteImages = async (files_: File[]): Promise<boolean> => {
    if (!files_.length) return false;
    setAttachError(null);
    for (const f of files_.slice(0, 5)) {
      try {
        const b64 = await blobToBase64(f);
        const abs = await invoke<string>('images_save_upload', { base64Data: b64, ext: extOf(f.type) });
        imgSeq.current += 1;
        const label = pastedImageName(imgSeq.current);
        setFiles((prev) => {
          if (prev.length >= 10) return prev;
          return [...prev, { uri: 'file:///' + abs.replace(/\\/g, '/'), name: `${label}.${extOf(f.type)}` }];
        });
      } catch (e) {
        setAttachError(`No se pudo adjuntar la imagen: ${String(e).slice(0, 160)}`);
      }
    }
    return true;
  };

  /** Pegar 5+ líneas colapsa a `[Pasted ~N lines]` (como OpenCode). */
  const onPaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    if (disabled || busy) return;
    const items = Array.from(e.clipboardData?.items ?? []);
    const imgFiles = items
      .filter((i) => i.type.startsWith('image/'))
      .map((i) => i.getAsFile())
      .filter((f): f is File => !!f);
    const dtFiles = Array.from(e.clipboardData?.files ?? []).filter((f) => f.type.startsWith('image/'));
    const all = [...imgFiles, ...dtFiles.filter((f) => !imgFiles.includes(f))];
    if (all.length) {
      e.preventDefault();
      void pasteImages(all);
      return;
    }
    const clip = e.clipboardData?.getData('text') ?? '';
    if (!clip) return;
    const lines = clip.split('\n').length;
    if (lines <= 4) return; // pegado corto: comportamiento normal
    e.preventDefault();
    snipSeq.current += 1;
    const n = snippets.length + 1;
    const marker = n === 1 && !draft.includes('[Pasted ~')
      ? `[Pasted ~${lines} lines]`
      : `[Pasted ~${lines} lines #${snipSeq.current}]`;
    setSnippets((prev) => [...prev, { marker, text: clip, expanded: false }]);
    const el = taRef.current;
    const before = el ? draft.slice(0, el.selectionStart ?? draft.length) : draft;
    const after = el ? draft.slice(el.selectionEnd ?? draft.length) : '';
    const sep = before && !before.endsWith('\n') ? '\n' : '';
    setDraft(`${before}${sep}${marker}\n${after}`);
    requestAnimationFrame(() => {
      const t = taRef.current;
      if (t) {
        const pos = (before + sep + marker + '\n').length;
        t.focus();
        t.setSelectionRange(pos, pos);
      }
    });
  };

  const submit = () => {
    if (!canSend) return;
    // Expandir marcadores al texto real antes de enviar.
    let text = draft.trim();
    for (const s of snippets) {
      if (text.includes(s.marker)) text = text.split(s.marker).join(s.text);
    }
    const out = files;
    setDraft('');
    setFiles([]);
    setSnippets([]);
    imgSeq.current = 0;
    onSend(text, out);
  };

  return (
    <div>
      {files.length > 0 && (
        <div className="mb-1.5 flex flex-wrap gap-1">
          {files.map((f) => (
            <span key={f.uri} title={f.uri} className="mono flex max-w-full items-center gap-1 rounded-md border border-forge-border bg-forge-panel px-1.5 py-0.5 text-[11px] text-forge-muted">
              <span className="truncate">{isImageChipName(f.name) ? f.name.replace(/\.(png|jpg|webp|gif)$/i, '') : `📎 ${f.name}`}</span>
              <button onClick={() => setFiles((prev) => prev.filter((x) => x.uri !== f.uri))} className="text-forge-faint hover:text-forge-err" title="Quitar adjunto">×</button>
            </span>
          ))}
        </div>
      )}
      {snippets.length > 0 && (
        <div className="mb-1.5 flex flex-col gap-1">
          {snippets.map((s) => (
            <div key={s.marker} className="rounded-md border border-forge-border bg-forge-panel px-1.5 py-0.5 text-[11px]">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSnippets((prev) => prev.map((x) => (x.marker === s.marker ? { ...x, expanded: !x.expanded } : x)))}
                  title="Ver/ocultar el texto pegado"
                  className="mono truncate text-forge-accent hover:underline"
                >
                  {s.expanded ? '▾' : '▸'} {s.marker}
                </button>
                <button
                  onClick={() => {
                    setSnippets((prev) => prev.filter((x) => x.marker !== s.marker));
                    setDraft(draft.split(s.marker).join('').replace(/\n{3,}/g, '\n\n'));
                  }}
                  className="ml-auto shrink-0 text-forge-faint hover:text-forge-err"
                  title="Quitar pegado"
                >
                  ×
                </button>
              </div>
              {s.expanded && (
                <pre className="mono mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap break-words rounded bg-forge-bg p-1.5 text-[11px] text-forge-muted" title={s.marker}>
                  {s.text.slice(0, 4000)}{s.text.length > 4000 ? '\n…(vista truncada; se envía completo)' : ''}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
      {attachError && <p className="mb-1 text-[11px] text-forge-err">{attachError}</p>}
      <div className="rounded-xl border border-forge-border bg-forge-bg transition-colors focus-within:border-forge-accent-dim">
        <textarea
          ref={taRef}
          rows={1}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onPaste={onPaste}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={placeholder}
          disabled={disabled || busy}
          className="max-h-40 min-h-[36px] w-full resize-none bg-transparent px-3 pt-2 outline-none placeholder:text-forge-faint disabled:opacity-50"
        />
        <div className="flex items-center gap-1 px-1.5 pb-1.5">
          <button
            onClick={pickFiles}
            disabled={disabled || busy}
            title="Adjuntar archivos (se envían como file:// al modelo)"
            className="rounded-md px-2 py-1 text-[13px] text-forge-muted transition-colors hover:bg-forge-panel2 hover:text-forge-text disabled:opacity-40"
          >
            📎
          </button>
          <div className="min-w-0 max-w-[240px] flex-1">
            {modelsReady ? (
              <ModelSelect value={modelValue} onChange={onModelChange} disabled={disabled || busy} />
            ) : (
              <span className="mono truncate text-[11px] text-forge-faint">modelos…</span>
            )}
          </div>
          <span className="mono hidden text-[10px] text-forge-faint sm:block">Enter ⏎ envía · ⇧Enter salto</span>
          {(busy || streaming) ? (
            <button onClick={onInterrupt} title="Detener respuesta (■)" className="btn btn-danger !px-3.5">■</button>
          ) : (
            <button onClick={submit} disabled={!canSend} className="btn btn-primary disabled:opacity-40">
              Enviar ⏎
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
