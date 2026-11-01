// Utilidades puras para renderizar mensajes del chat.
// Contrato real (volcados v2.2.4 verificados con scripts/probe-*.cjs):
// - usuario: { type:'user', payload:{ text, files?[{uri,name?}] } } (a veces text arriba)
// - assistant: { type:'assistant', content:[{type:'text',text}|{type:'tool',...}] }
// - tool ok:   { type:'tool', name, state:{status:'completed',input,content:[{type:'text',text}],metadata?}, time:{ran,completed} }
// - tool mal:  { ..., state:{status:'error',input,error:{type,message}} }
// Sin mocks: lo que no existe se devuelve como null/desconocido, nunca inventado.
import type { MessagePart, SessionMessage } from '../opencode';

type AnyMsg = Record<string, unknown>;

function asObj(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : null;
}

/** Texto de un mensaje de usuario (payload.text es la forma del servidor). */
export function userText(m: SessionMessage): string {
  if (typeof m.text === 'string' && m.text.trim()) return m.text;
  const payload = asObj((m as AnyMsg).payload);
  const t = payload?.text;
  return typeof t === 'string' ? t : '';
}

export interface ChatAttachment {
  uri: string;
  name: string;
}

/** Adjuntos declarados por el servidor en payload.files. */
export function userFiles(m: SessionMessage): ChatAttachment[] {
  const payload = asObj((m as AnyMsg).payload);
  const files = payload?.files;
  if (!Array.isArray(files)) return [];
  const out: ChatAttachment[] = [];
  for (const f of files) {
    const o = asObj(f);
    const uri = o?.uri;
    if (typeof uri !== 'string' || !uri) continue;
    const given = o?.name;
    const name = typeof given === 'string' && given ? given : uri.split(/[\\/]/).pop() || uri;
    out.push({ uri, name });
  }
  return out;
}

/** Bloques de contenido de un mensaje del asistente (content[] o parts[] legacy). */
export function assistantBlocks(m: SessionMessage): MessagePart[] {
  if (Array.isArray(m.content)) return m.content as MessagePart[];
  if (Array.isArray(m.parts)) return m.parts as MessagePart[];
  return [];
}

export function assistantTexts(m: SessionMessage): string[] {
  return assistantBlocks(m)
    .filter((p) => p && typeof p === 'object' && p.type === 'text' && typeof p.text === 'string' && p.text.trim())
    .map((p) => (p as { text: string }).text);
}

export function toolParts(m: SessionMessage): MessagePart[] {
  return assistantBlocks(m).filter(
    (p) => p && typeof p === 'object' && (p.type === 'tool' || typeof (p as { name?: unknown }).name === 'string'),
  );
}

export type ToolState = 'completed' | 'error' | 'running' | 'pending';

function partState(p: MessagePart): Record<string, unknown> {
  const s = (p as { state?: unknown }).state;
  return asObj(s) ?? {};
}

/** Estado honesto: completed|error si el servidor lo dice; si no, running solo con streaming activo. */
export function toolStatus(p: MessagePart, streaming: boolean): ToolState {
  const st = String(partState(p).status ?? '');
  if (st === 'completed') return 'completed';
  if (st === 'error' || st === 'failed') return 'error';
  return streaming ? 'running' : 'pending';
}

export function toolName(p: MessagePart): string {
  const n = (p as { name?: unknown }).name;
  if (typeof n === 'string' && n) return n;
  return typeof p.type === 'string' && p.type !== 'tool' ? p.type : 'herramienta';
}

/** Resumen de la entrada: primeros valores string del input. */
export function toolInputPreview(p: MessagePart, max = 120): string {
  const input = asObj(partState(p).input);
  if (!input) return '';
  const vals = Object.values(input).filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
  if (!vals.length) return '';
  const s = vals.join(' · ');
  return s.length > max ? s.slice(0, max) + '…' : s;
}

/** Salida textual real de la herramienta (state.content[]), o null si no hay. */
export function toolOutput(p: MessagePart, max = 4000): string | null {
  const content = partState(p).content;
  if (!Array.isArray(content)) return null;
  const texts = content
    .map((b) => asObj(b))
    .filter((b): b is Record<string, unknown> => !!b && typeof b.text === 'string' && (b.text as string).trim().length > 0)
    .map((b) => b.text as string);
  if (!texts.length) return null;
  const s = texts.join('\n');
  return s.length > max ? s.slice(0, max) + '\n…(truncado)' : s;
}

/** Mensaje de error real (state.error.message) o null. */
export function toolError(p: MessagePart): string | null {
  const err = asObj(partState(p).error);
  const msg = err?.message ?? err?.text;
  return typeof msg === 'string' && msg.trim() ? msg.trim().slice(0, 1000) : null;
}

/** Duración medida por el servidor (time.ran → time.completed), o null. */
export function toolDurationMs(p: MessagePart): number | null {
  const t = asObj((p as { time?: unknown }).time);
  const ran = t?.ran;
  const done = t?.completed;
  if (typeof ran === 'number' && typeof done === 'number' && done >= ran) return done - ran;
  return null;
}

export function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}
