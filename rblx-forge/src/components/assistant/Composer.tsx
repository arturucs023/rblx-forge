// Composer: textarea auto-ajustable, Enter envía / Shift+Enter salta línea,
// adjuntos reales (file://, verificados 200 contra el servidor), selector de
// modelo, enviar/detener. Sin botones decorativos: todo funciona.
import { useEffect, useRef, useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { ModelSelect } from './ModelSelect';
import type { ModelValue } from '../ModelPicker';

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
  const taRef = useRef<HTMLTextAreaElement>(null);

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

  const submit = () => {
    if (!canSend) return;
    const text = draft.trim();
    const out = files;
    setDraft('');
    setFiles([]);
    onSend(text, out);
  };

  return (
    <div>
      {files.length > 0 && (
        <div className="mb-1.5 flex flex-wrap gap-1">
          {files.map((f) => (
            <span key={f.uri} title={f.uri} className="mono flex max-w-full items-center gap-1 rounded-md border border-forge-border bg-forge-panel px-1.5 py-0.5 text-[11px] text-forge-muted">
              <span className="truncate">📎 {f.name}</span>
              <button onClick={() => setFiles((prev) => prev.filter((x) => x.uri !== f.uri))} className="text-forge-faint hover:text-forge-err" title="Quitar adjunto">×</button>
            </span>
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
