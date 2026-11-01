// Cliente tipado de la API HTTP de OpenCode (contratos verificados v2.2.4,
// ver rblx-forge/docs/OPENCODE_INTEGRATION.md + docs-openapi-2.2.4.json).
// Autenticación real: `Authorization: Basic base64("opencode:"+password)`,
// password capturado de la salida de `serve` (verificado por inspección del
// tráfico del CLI). El password vive solo en memoria; jamás se persiste.
// Sin API keys: la autenticación de proveedores vive en OpenCode.

export interface ModelCost {
  input?: number;
  output?: number;
}

export interface ModelInfo {
  id: string;
  modelID: string;
  providerID: string;
  name?: string;
  cost?: ModelCost[];
}

export interface SessionSummary {
  id: string;
  title?: string | null;
  directory?: string;
  project?: string;
  updatedAt?: string;
}

export interface SessionDetail extends SessionSummary {
  model?: { id: string; providerID: string; variant?: string };
  agent?: string;
}

export interface SessionMessage {
  id: string;
  role?: string;
  type?: string;
  text?: string;
  parts?: MessagePart[];
  /** Contrato real v2.2.4 en mensajes assistant: bloques content[]. */
  content?: MessagePart[];
  tokens?: { input?: number; output?: number; reasoning?: number };
  cost?: number;
  [k: string]: unknown;
}

export interface MessagePart {
  type: string;
  text?: string;
  [k: string]: unknown;
}

export interface PermissionRequest {
  id: string;
  action: string;
  resources?: string[];
  metadata?: unknown;
  [k: string]: unknown;
}

export interface ServerInfo {
  version: string;
  pid: number;
  hostname: string;
  urls: string[];
}

export interface OpenCodeEvent {
  type: string;
  properties?: Record<string, unknown>;
  [k: string]: unknown;
}

export interface ClientOptions {
  base: string;
  password?: string;
}

function authHeader(password?: string): Record<string, string> {
  if (!password) return {};
  // El password de `serve` es ASCII; btoa es seguro aquí.
  return { Authorization: 'Basic ' + btoa('opencode:' + password) };
}

async function req<T>(base: string, password: string | undefined, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(base + path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...authHeader(password), ...(init?.headers ?? {}) },
  });
  if (res.status === 401) throw new Error(`OpenCode 401 en ${path}: falta password o servidor ajeno`);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`OpenCode ${res.status} ${path}: ${body.slice(0, 300)}`);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  const j = JSON.parse(text);
  // El servidor envuelve casi todo en `{data: …}` (verificado); /api/info no.
  return ((j && typeof j === 'object' && 'data' in j ? (j as { data: unknown }).data : j) as T);
}

export function createClient(opts: ClientOptions) {
  const clean = opts.base.replace(/\/$/, '');
  const pw = opts.password;
  return {
    base: clean,
    info: () => req<ServerInfo>(clean, pw, '/api/info'),
    listSessions: (params?: { directory?: string; project?: string; limit?: number }) => {
      const q = new URLSearchParams();
      if (params?.directory) q.set('directory', params.directory);
      if (params?.project) q.set('project', params.project);
      if (params?.limit) q.set('limit', String(params.limit));
      const s = q.toString();
      return req<SessionSummary[]>(clean, pw, '/api/session' + (s ? '?' + s : ''));
    },
    createSession: (body?: { title?: string; directory?: string }) =>
      req<SessionSummary>(clean, pw, '/api/session', {
        method: 'POST',
        body: JSON.stringify(body ?? {}),
      }),
    deleteSession: (id: string) =>
      req<void>(clean, pw, `/api/session/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    sendPrompt: (id: string, text: string) =>
      req<SessionMessage>(clean, pw, `/api/session/${encodeURIComponent(id)}/prompt`, {
        method: 'POST',
        body: JSON.stringify({ text }),
      }),
    listMessages: (id: string, limit = 100) =>
      req<SessionMessage[]>(
        clean,
        pw,
        `/api/session/${encodeURIComponent(id)}/message?limit=${limit}&order=asc`,
      ),
    interrupt: (id: string) =>
      req<void>(clean, pw, `/api/session/${encodeURIComponent(id)}/interrupt`, { method: 'POST' }),
    listPermissions: (id: string) =>
      req<PermissionRequest[]>(clean, pw, `/api/session/${encodeURIComponent(id)}/permission`),
    replyPermission: (id: string, requestId: string, decision: 'allow' | 'deny', message?: string) =>
      req<void>(
        clean,
        pw,
        `/api/session/${encodeURIComponent(id)}/permission/${encodeURIComponent(requestId)}/reply`,
        { method: 'POST', body: JSON.stringify({ decision, message }) },
      ),
    listModels: () => req<ModelInfo[]>(clean, pw, '/api/model'),
    listProviders: () => req<unknown[]>(clean, pw, '/api/provider'),
    getDefaultModel: () => req<ModelInfo>(clean, pw, '/api/model/default'),
    getSession: (id: string) => req<SessionDetail>(clean, pw, `/api/session/${encodeURIComponent(id)}`),
    switchModel: (id: string, model: { id: string; providerID: string; variant?: string }) =>
      req<unknown>(clean, pw, `/api/session/${encodeURIComponent(id)}/model`, {
        method: 'POST',
        body: JSON.stringify({ model }),
      }),
    listMcpServers: (location?: string) => {
      const q = location ? '?location=' + encodeURIComponent(location) : '';
      return req<Array<{ name: string; status?: { status?: string } }>>(clean, pw, '/api/mcp' + q);
    },

    /**
     * SSE mediante fetch+lector (EventSource no admite cabecera
     * Authorization). Parsea frames `data: {...}` separados por línea vacía.
     * Devuelve función para cancelar.
     */
    subscribe: (onEvent: (e: OpenCodeEvent) => void, types?: string[]) => {
      const ctrl = new AbortController();
      let cancelled = false;
      const q = types?.length ? '?types=' + encodeURIComponent(types.join(',')) : '';
      (async () => {
        try {
          const res = await fetch(clean + '/api/event' + q, {
            headers: { Accept: 'text/event-stream', ...authHeader(pw) },
            signal: ctrl.signal,
          });
          if (!res.ok || !res.body) {
            onEvent({ type: 'forge:sse-error' });
            return;
          }
          const reader = res.body.getReader();
          const dec = new TextDecoder();
          let buf = '';
          for (;;) {
            const { done, value } = await reader.read();
            if (done || cancelled) break;
            buf += dec.decode(value, { stream: true });
            let idx: number;
            while ((idx = buf.indexOf('\n\n')) >= 0) {
              const chunk = buf.slice(0, idx);
              buf = buf.slice(idx + 2);
              for (const line of chunk.split('\n')) {
                const t = line.trim();
                if (!t.startsWith('data:')) continue;
                const d = t.slice(5).trim();
                if (!d || d === '[DONE]') continue;
                try {
                  onEvent(JSON.parse(d) as OpenCodeEvent);
                } catch {
                  /* latido u otro frame: se ignora sin romper el stream */
                }
              }
            }
          }
        } catch {
          if (!cancelled) onEvent({ type: 'forge:sse-error' });
        }
      })();
      return () => {
        cancelled = true;
        ctrl.abort();
      };
    },
  };
}

export type OpenCodeClient = ReturnType<typeof createClient>;
