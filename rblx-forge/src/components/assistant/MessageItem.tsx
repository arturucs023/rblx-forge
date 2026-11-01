// Mensaje del chat: usuario (burbuja + adjuntos) o asistente (markdown real,
// herramientas, meta). Sin contenido visible no se pinta.
import { memo } from 'react';
import { useSessions } from '../../stores/sessions';
import type { SessionMessage } from '../../lib/opencode';
import { isUserMessage } from '../../lib/opencode';
import { assistantTexts, toolParts, userFiles, userText, type ChatAttachment } from '../../lib/chat/text';
import { Markdown } from './Markdown';
import { ToolBlock } from './ToolBlock';
import { formatCost, formatTokens } from '../../lib/session-stats';

function AttachList({ files }: { files: ChatAttachment[] }) {
  if (!files.length) return null;
  return (
    <div className="mb-1.5 flex flex-wrap gap-1">
      {files.map((f) => (
        <span key={f.uri} title={f.uri} className="mono inline-block max-w-full truncate rounded-md border border-forge-border-soft bg-forge-panel px-1.5 py-0.5 text-[11px] text-forge-muted">
          📎 {f.name}
        </span>
      ))}
    </div>
  );
}

function Stamp({ m }: { m: SessionMessage }) {
  const raw = (m as unknown as { time?: { created?: number } }).time?.created;
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return null;
  const d = new Date(raw > 1e12 ? raw : raw * 1000);
  if (Number.isNaN(d.getTime())) return null;
  return (
    <span className="mono ml-auto shrink-0 text-[10px] text-forge-faint" title={d.toLocaleString()}>
      {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
    </span>
  );
}

export const MessageItem = memo(function MessageItem({ m, isLast, onContinue, streaming }: {
  m: SessionMessage;
  isLast: boolean;
  onContinue: () => void;
  streaming: boolean;
}) {
  const activeModel = useSessions((s) => s.activeModel);
  const busy = useSessions((s) => s.busy);
  const modelLabel = activeModel ? `${activeModel.providerID}/${activeModel.id}${activeModel.variant ? ` · ${activeModel.variant}` : ''}` : null;
  if (!m || typeof m !== 'object') return null;

  if (isUserMessage(m)) {
    const text = userText(m);
    const files = userFiles(m);
    if (!text && files.length === 0) return null;
    return (
      <div className="anim-enter mb-2.5 ml-auto max-w-3xl">
        {files.length > 0 && <AttachList files={files} />}
        {text ? (
          <pre className="whitespace-pre-wrap rounded-2xl rounded-br-md bg-forge-accent px-3.5 py-2 text-[12.5px] font-medium leading-relaxed text-[#141414]">{text}</pre>
        ) : null}
      </div>
    );
  }

  const texts = assistantTexts(m);
  const tools = toolParts(m);
  if (texts.length === 0 && tools.length === 0) return null; // reasoning puro: va en Actividad, no ensucia el chat
  const t = (m.tokens ?? {}) as { input?: number; output?: number };
  const hasMeta = typeof t.input === 'number' || typeof t.output === 'number' || typeof m.cost === 'number';

  return (
    <div className="anim-enter mb-2.5 max-w-3xl">
      <div className="mb-1 flex items-center gap-1.5 text-[11px]">
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-forge-accent-soft text-[11px] text-forge-accent">✦</span>
        <span className="font-semibold text-forge-muted">{modelLabel ?? 'asistente'}</span>
        <Stamp m={m} />
      </div>
      {tools.length > 0 && <ToolBlock tools={tools} streaming={streaming} />}
      {texts.map((text, i) => (
        <div key={i} className="mb-1.5 rounded-2xl rounded-bl-md border border-forge-border bg-forge-panel2 px-3.5 py-2 text-[12.5px] leading-relaxed last:mb-0">
          <Markdown text={text} />
        </div>
      ))}
      <div className="mt-1 flex items-center gap-2">
        {hasMeta && (
          <div className="mono text-[10px] text-forge-faint">
            {typeof t.input === 'number' && <span title="Tokens de entrada">⬆{formatTokens(t.input)} </span>}
            {typeof t.output === 'number' && <span title="Tokens de salida">⬇{formatTokens(t.output)} </span>}
            {typeof m.cost === 'number' && <span title="Coste estimado">{formatCost(m.cost)}</span>}
          </div>
        )}
        {isLast && !busy && (
          <button onClick={onContinue} title="Pedir al modelo que continúe" className="ml-auto text-[11px] text-forge-faint transition-colors hover:text-forge-accent">
            Continuar ⏩
          </button>
        )}
      </div>
    </div>
  );
});
