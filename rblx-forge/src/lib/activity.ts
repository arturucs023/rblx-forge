// Feed de actividad derivado de eventos REALES de OpenCode v2.2.4
// (taxonomía observada con tráfico: ver docs/OPENCODE_INTEGRATION.md).
// Sin simulación: lo desconocido se muestra como genérico, nunca inventado.

export interface FeedItem {
  id: number;
  ts: number;
  kind: 'mensaje' | 'herramienta' | 'archivo' | 'comando' | 'permiso' | 'paso' | 'uso' | 'error' | 'sistema';
  title: string;
  detail?: string;
  sessionId?: string;
  // Atribución solo cuando el evento la trae; jamás se inventa el origen.
  origin?: string;
}

export interface TrackedCall {
  callId: string;
  name: string;
  input: unknown;
  status: 'preparando' | 'ejecutando' | 'ok' | 'error';
  startedAt: number;
  endedAt?: number;
  resultPreview?: string;
  files: { rel: string; kind: 'leído' | 'modificado' }[];
}

const FILE_TOOLS_READ = new Set(['read', 'glob', 'grep', 'list', 'ls', 'find']);
const FILE_TOOLS_WRITE = new Set(['write', 'edit', 'patch', 'apply', 'create']);

function inputPaths(input: unknown): string[] {
  if (!input || typeof input !== 'object') return [];
  const o = input as Record<string, unknown>;
  const out: string[] = [];
  for (const k of ['path', 'file', 'filePath', 'filename']) {
    if (typeof o[k] === 'string') out.push(o[k] as string);
  }
  if (Array.isArray(o.paths)) for (const p of o.paths) if (typeof p === 'string') out.push(p);
  if (Array.isArray(o.files)) for (const p of o.files) if (typeof p === 'string') out.push(p);
  return out.slice(0, 8);
}

export function shortPath(p: string): string {
  const t = p.replace(/\//g, '\\').split('\\');
  return t.length > 3 ? '…\\' + t.slice(-3).join('\\') : p;
}

/** Clasifica un evento SSE en item(s) de feed. Devuelve [] si no es mostrable. */
export function eventToFeed(e: { type: string; properties?: Record<string, unknown>; data?: unknown; created?: number }, sessionId: string | null, seq: number): FeedItem[] {
  const ts = typeof e.created === 'number' ? e.created : Date.now();
  const d = (e.data ?? e.properties ?? {}) as Record<string, unknown>;
  const sid = (typeof d.sessionID === 'string' && d.sessionID) || sessionId || undefined;
  const mk = (kind: FeedItem['kind'], title: string, detail?: string): FeedItem => ({ id: seq, ts, kind, title, detail, sessionId: sid });
  switch (e.type) {
    case 'session.inbox.enqueued': {
      const item = d.item as { payload?: { text?: string } } | undefined;
      return [mk('mensaje', 'Mensaje enviado', item?.payload?.text?.slice(0, 160))];
    }
    case 'session.execution.started':
      return [mk('sistema', 'Ejecución iniciada')];
    case 'session.execution.succeeded':
      return [mk('sistema', 'Ejecución completada')];
    case 'session.execution.failed':
      return [mk('error', 'Ejecución fallida', JSON.stringify(d).slice(0, 200))];
    case 'session.step.started': {
      const agent = typeof d.agent === 'string' ? d.agent : '?';
      const model = (d.model as { id?: string } | undefined)?.id ?? '?';
      return [mk('paso', `Paso iniciado · ${agent} · ${model}`)];
    }
    case 'session.step.ended': {
      const t = (d.tokens ?? {}) as Record<string, unknown>;
      return [mk('paso', `Paso fin (${String(d.finish ?? '?')})`, `tokens in=${t.input} out=${t.output} coste=${d.cost}`)];
    }
    case 'session.usage.updated': {
      const t = (d.tokens ?? {}) as Record<string, unknown>;
      return [mk('uso', 'Uso actualizado', `in=${t.input} out=${t.output} coste=${d.cost}`)];
    }
    case 'session.text.started':
      return [mk('mensaje', 'Respuesta en curso…')];
    case 'session.text.ended':
      return [mk('mensaje', 'Respuesta recibida', typeof d.text === 'string' ? d.text.slice(0, 200) : undefined)];
    case 'session.tool.input.started':
      return [mk('herramienta', `Herramienta: ${String((d as { name?: unknown }).name ?? '?')} (preparando)`)];
    case 'session.tool.input.ended':
    case 'session.tool.called':
    case 'session.tool.success':
    case 'session.tool.failed':
      return []; // los gestiona trackToolCall (necesitan join por call id)
    case 'mcp.status.changed':
      return [mk('sistema', `MCP: ${String(d.server ?? '?')}`)];
    default:
      if (e.type.startsWith('session.')) return [mk('sistema', e.type)];
      return [];
  }
}

export interface ToolTransition {
  feed: FeedItem[];
  call?: TrackedCall;
  updateCall?: { id: string; patch: Partial<TrackedCall> };
}

/** Join por call id para herramienta inicio→fin con archivos afectados. */
export function trackToolCall(
  e: { type: string; data?: unknown; properties?: unknown; created?: number },
  known: Map<string, TrackedCall>,
  seq: number,
): ToolTransition {
  const d = ((e.data ?? e.properties ?? {}) as Record<string, unknown>);
  const ts = typeof (e as { created?: unknown }).created === 'number' ? ((e as { created: number }).created) : Date.now();
  const sid = typeof d.sessionID === 'string' ? d.sessionID : undefined;
  const id = typeof d.id === 'string' ? d.id : '';
  if (e.type === 'session.tool.input.started' && id) {
    const call: TrackedCall = {
      callId: id,
      name: String((d as { name?: unknown }).name ?? '?'),
      input: null,
      status: 'preparando',
      startedAt: ts,
      files: [],
    };
    return { feed: [{ id: seq, ts, kind: 'herramienta', title: `Herramienta: ${call.name} (preparando)`, sessionId: sid }], call };
  }
  if ((e.type === 'session.tool.input.ended' || e.type === 'session.tool.called') && id) {
    const prev = known.get(id);
    const input = (d as { input?: unknown }).input ?? (d as { text?: unknown }).text;
    let parsed: unknown = input;
    if (typeof input === 'string') {
      try { parsed = JSON.parse(input); } catch { parsed = input; }
    }
    const name = prev?.name ?? '?';
    const files = inputPaths(parsed).map((p) => ({
      rel: p,
      kind: (FILE_TOOLS_WRITE.has(name) ? 'modificado' : 'leído') as 'leído' | 'modificado',
    }));
    const title = e.type === 'session.tool.called'
      ? `Herramienta: ${name} (ejecutando)`
      : `Herramienta: ${name} args: ${JSON.stringify(parsed).slice(0, 160)}`;
    return { feed: [{ id: seq, ts, kind: FILE_TOOLS_READ.has(name) || FILE_TOOLS_WRITE.has(name) ? 'archivo' : 'herramienta', title, sessionId: sid }], updateCall: { id, patch: { input: parsed, status: 'ejecutando', files } } };
  }
  if ((e.type === 'session.tool.success' || e.type === 'session.tool.failed') && id) {
    const prev = known.get(id);
    const name = prev?.name ?? '?';
    const ok = e.type === 'session.tool.success';
    const content = (d as { content?: Array<{ text?: string }> }).content;
    const resultPreview = Array.isArray(content) ? content.map((c) => c.text ?? '').join('\n').slice(0, 300) : undefined;
    return {
      feed: [{ id: seq, ts, kind: ok ? 'herramienta' : 'error', title: `Herramienta: ${name} (${ok ? 'OK' : 'ERROR'})`, detail: resultPreview, sessionId: sid }],
      updateCall: { id, patch: { status: ok ? 'ok' : 'error', endedAt: ts, resultPreview } },
    };
  }
  return { feed: [] };
}
