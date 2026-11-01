// Bloque de herramientas: estado real por herramienta, duración medida por el
// servidor cuando la trae, salida/error expandibles. Sin razonamientos.
import { useMemo, useState } from 'react';
import type { MessagePart } from '../../lib/opencode';
import {
  formatMs,
  toolDurationMs,
  toolError,
  toolInputPreview,
  toolName,
  toolOutput,
  toolStatus,
} from '../../lib/chat/text';

const STATE_STYLE: Record<string, { dot: string; label: string; text: string }> = {
  completed: { dot: 'bg-forge-ok', label: 'completada', text: 'text-forge-ok' },
  error: { dot: 'bg-forge-err', label: 'error', text: 'text-forge-err' },
  running: { dot: 'bg-forge-accent dot-live', label: 'ejecutando', text: 'text-forge-accent' },
  pending: { dot: 'bg-forge-faint', label: 'pendiente', text: 'text-forge-muted' },
};

function ToolRow({ part, streaming, defaultOpen }: { part: MessagePart; streaming: boolean; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const st = toolStatus(part, streaming);
  const style = STATE_STYLE[st];
  const name = toolName(part);
  const input = toolInputPreview(part);
  const output = toolOutput(part);
  const error = toolError(part);
  const ms = toolDurationMs(part);
  const hasDetail = !!(input || output || error || ms !== null);

  return (
    <div className="mb-1 overflow-hidden rounded-lg border border-forge-border-soft bg-forge-bg">
      <button
        onClick={() => hasDetail && setOpen((v) => !v)}
        className={`flex w-full items-center gap-2 px-2 py-1.5 text-left ${hasDetail ? 'cursor-pointer hover:bg-forge-panel' : 'cursor-default'}`}
        title={hasDetail ? 'Ver detalle' : undefined}
      >
        <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`} />
        <span className="mono min-w-0 flex-1 truncate text-[12px] font-semibold text-forge-text">{name}</span>
        {input && <span className="mono hidden min-w-0 flex-1 truncate text-[11px] text-forge-faint lg:block" title={input}>{input}</span>}
        {ms !== null && <span className="mono shrink-0 text-[10px] text-forge-faint">{formatMs(ms)}</span>}
        <span className={`shrink-0 text-[11px] font-semibold ${style.text}`}>{style.label}</span>
        {hasDetail && <span className="shrink-0 text-[11px] text-forge-faint">{open ? '▾' : '▸'}</span>}
      </button>
      {open && hasDetail && (
        <div className="border-t border-forge-border-soft px-2 py-1.5">
          {input && (
            <div className="mono mb-1 break-words text-[11px] text-forge-muted">
              <span className="text-forge-faint">entrada: </span>{input}
            </div>
          )}
          {output && (
            <pre className="mono max-h-56 overflow-auto whitespace-pre-wrap break-words rounded bg-forge-panel p-1.5 text-[11px] text-forge-muted">{output}</pre>
          )}
          {error && (
            <div className="mt-1 rounded border border-forge-err/40 bg-forge-err-soft p-1.5 text-[11px] text-forge-err">{error}</div>
          )}
        </div>
      )}
    </div>
  );
}

export function ToolBlock({ tools, streaming }: { tools: MessagePart[]; streaming: boolean }) {
  const [collapsed, setCollapsed] = useState(false);
  const running = useMemo(
    () => tools.filter((p) => toolStatus(p, streaming) === 'running').length,
    [tools, streaming],
  );
  const failed = useMemo(() => tools.filter((p) => toolStatus(p, streaming) === 'error').length, [tools, streaming]);
  const done = useMemo(() => tools.filter((p) => toolStatus(p, streaming) === 'completed').length, [tools, streaming]);

  return (
    <div className="mb-2 overflow-hidden rounded-xl border border-forge-border bg-forge-panel">
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left transition-colors hover:bg-forge-panel2"
      >
        <span className="text-forge-accent">{collapsed ? '▸' : '▾'}</span>
        {running > 0 ? (
          <span className="text-[12px]">
            <span className="dot-live mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-forge-accent" />
            <span className="font-semibold text-forge-text">Ejecutando {tools.length - running}/{tools.length}</span>
            <span className="text-forge-muted"> — herramientas del modelo</span>
          </span>
        ) : (
          <span className="text-[12px]">
            <span className={`font-semibold ${failed > 0 ? 'text-forge-err' : 'text-forge-ok'}`}>
              {failed > 0 ? `✕ ${failed} con error` : `✓ ${done} ${done === 1 ? 'acción' : 'acciones'}`}
            </span>
            <span className="text-forge-muted"> · {tools.length} llamadas</span>
          </span>
        )}
      </button>
      {!collapsed && (
        <div className="px-1.5 pb-1.5">
          {tools.map((p, i) => <ToolRow key={i} part={p} streaming={streaming} defaultOpen={tools.length === 1} />)}
          <p className="px-1 pb-0.5 text-[10px] text-forge-faint">Solo actividad y resultados. El razonamiento interno del modelo no se muestra.</p>
        </div>
      )}
    </div>
  );
}
