import { create } from 'zustand';
import { createClient, type OpenCodeClient, type PermissionRequest, type SessionMessage, type SessionSummary, type ModelInfo } from '../lib/opencode';
import { eventToFeed, trackToolCall, type FeedItem, type TrackedCall } from '../lib/activity';
import { useApp } from './app';

interface SessionsState {
  client: OpenCodeClient | null;
  cwd: string | null;
  sessions: SessionSummary[];
  activeId: string | null;
  messages: Record<string, SessionMessage[]>;
  permissions: PermissionRequest[];
  feed: FeedItem[];
  calls: Record<string, TrackedCall[]>;
  feedSeq: number;
  usage: { input?: number; output?: number; cost?: number } | null;
  assistantDraft: string | null;
  models: ModelInfo[];
  defaultModel: ModelInfo | null;
  activeModel: { id: string; providerID: string; variant?: string } | null;
  busy: boolean;
  streaming: boolean;
  error: string | null;
  sseOff: (() => void) | null;

  setCwd: (dir: string | null) => void;
  pushFeed: (items: FeedItem[]) => void;
  clearFeed: () => void;
  setAssistantDraft: (text: string | null) => void;
  fetchModels: () => Promise<void>;
  refreshActiveModel: () => Promise<void>;
  switchModel: (model: { id: string; providerID: string; variant?: string }) => Promise<void>;

  connect: (base: string, password?: string) => void;
  disconnect: () => void;
  loadSessions: (directory?: string) => Promise<void>;
  createSession: (title?: string, directory?: string) => Promise<void>;
  selectSession: (id: string) => Promise<void>;
  closeSession: (id: string) => Promise<void>;
  sendPrompt: (text: string) => Promise<void>;
  refreshPermissions: () => Promise<void>;
  replyPermission: (requestId: string, decision: 'allow' | 'deny') => Promise<void>;
}

/** Extrae texto visible. Contrato real: user.text, assistant.content[] (se
 * excluye reasoning), con tolerancia a la forma antigua parts[]. */
function partsText(m: SessionMessage): string {
  const out: string[] = [];
  if (typeof m.text === 'string' && m.text.trim()) out.push(m.text);
  for (const p of m.content ?? m.parts ?? []) {
    if (typeof p.text === 'string' && p.text.trim() && p.type !== 'reasoning') out.push(p.text);
  }
  return out.join('\n');
}

export const useSessions = create<SessionsState>((set, get) => ({
  client: null,
  cwd: null,
  sessions: [],
  activeId: null,
  messages: {},
  permissions: [],
  feed: [],
  calls: {},
  feedSeq: 0,
  usage: null,
  assistantDraft: null,
  models: [],
  defaultModel: null,
  activeModel: null,
  busy: false,
  streaming: false,
  error: null,
  sseOff: null,

  connect: (base, password) => {
    get().sseOff?.();
    const client = createClient({ base, password });
    const known = new Map<string, TrackedCall>();
    const off = client.subscribe((e) => {
      const push = useApp.getState().pushActivity;
      if (e.type === 'forge:sse-error') {
        push('warn', 'sse', 'Canal de eventos interrumpido; reintentando bajo demanda.');
        return;
      }
      const st = get();
      const active = st.activeId;
      const data = ((e as { data?: unknown }).data ?? {}) as Record<string, unknown>;
      const evSid = typeof data.sessionID === 'string' ? data.sessionID : null;
      // Solo se muestra la sesión activa (el resto sigue en el servidor).
      if (active && evSid && evSid !== active) return;
      let seq = st.feedSeq + 1;
      const items = eventToFeed({ type: e.type, data, created: (e as { created?: number }).created }, active, seq);
      seq += items.length;
      const tr = trackToolCall({ type: e.type, data }, known, seq);
      seq += tr.feed.length;
      if (tr.call) {
        known.set(tr.call.callId, tr.call);
        const arr = [...(st.calls[active ?? ''] ?? []), tr.call];
        set({ calls: { ...st.calls, [active ?? '']: arr } });
      }
      if (tr.updateCall) {
        const prev = known.get(tr.updateCall.id);
        if (prev) {
          const merged = { ...prev, ...tr.updateCall.patch };
          known.set(tr.updateCall.id, merged as TrackedCall);
          const arr = (st.calls[active ?? ''] ?? []).map((c) => (c.callId === tr.updateCall!.id ? (merged as TrackedCall) : c));
          set({ calls: { ...st.calls, [active ?? '']: arr } });
        }
      }
      const all = [...items, ...tr.feed];
      if (all.length) {
        set({ feed: [...st.feed.slice(-499), ...all.map((it, i) => ({ ...it, id: st.feedSeq + i + 1 })), ], feedSeq: st.feedSeq + all.length });
      }
      if (typeof data.cost === 'number' || data.tokens) {
        const t = (data.tokens ?? {}) as { input?: number; output?: number };
        set({ usage: { input: typeof t.input === 'number' ? t.input : get().usage?.input, output: typeof t.output === 'number' ? t.output : get().usage?.output, cost: typeof data.cost === 'number' ? data.cost : get().usage?.cost } });
      }
      if (e.type === 'session.execution.succeeded' || e.type === 'session.execution.failed' || e.type === 'session.text.ended') {
        if (active) {
          get().selectSession(active).catch(() => {});
          get().refreshPermissions().catch(() => {});
        }
      }
    });
    set({ client, sseOff: off, error: null });
    get().fetchModels().catch(() => {});
  },

  setCwd: (dir) => {
    set({ cwd: dir, activeId: null, messages: {}, permissions: [], feed: [], calls: {}, usage: null });
    if (dir) get().loadSessions(dir).catch(() => {});
  },

  pushFeed: (items) =>
    set((s) => ({ feed: [...s.feed.slice(-499), ...items] })),
  clearFeed: () => set({ feed: [], calls: {} }),
  setAssistantDraft: (text) => set({ assistantDraft: text }),

  fetchModels: async () => {
    const c = get().client;
    if (!c) return;
    try {
      const [models, def] = await Promise.all([
        c.listModels().catch(() => [] as ModelInfo[]),
        c.getDefaultModel().catch(() => null),
      ]);
      set({ models, defaultModel: def });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  refreshActiveModel: async () => {
    const c = get().client;
    const id = get().activeId;
    if (!c || !id) {
      set({ activeModel: null });
      return;
    }
    try {
      const detail = await c.getSession(id);
      set({ activeModel: detail.model ?? null, error: null });
    } catch {
      set({ activeModel: null });
    }
  },

  switchModel: async (model) => {
    const c = get().client;
    const id = get().activeId;
    if (!c || !id) return;
    set({ busy: true, error: null });
    try {
      await c.switchModel(id, model);
      await get().refreshActiveModel();
      useApp.getState().pushActivity('info', 'modelo', `Sesión ahora usa ${model.providerID}/${model.id}${model.variant ? ` (${model.variant})` : ''}`);
    } catch (e) {
      set({ error: String(e) });
    } finally {
      set({ busy: false });
    }
  },

  disconnect: () => {
    get().sseOff?.();
    set({ client: null, sessions: [], activeId: null, messages: {}, permissions: [], sseOff: null });
  },

  loadSessions: async (directory) => {
    const c = get().client;
    if (!c) return;
    try {
      const list = await c.listSessions(directory ? { directory } : undefined);
      set({ sessions: list, error: null });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  createSession: async (title, directory) => {
    const c = get().client;
    if (!c) return;
    const dir = directory ?? get().cwd ?? undefined;
    set({ busy: true, error: null });
    try {
      const s = await c.createSession({ title, directory: dir });
      set((st) => ({ sessions: [s, ...st.sessions], activeId: s.id, busy: false }));
      await get().selectSession(s.id);
    } catch (e) {
      set({ busy: false, error: String(e) });
    }
  },

  selectSession: async (id) => {
    const c = get().client;
    if (!c) return;
    set({ activeId: id });
    try {
      const msgs = await c.listMessages(id);
      set((st) => ({ messages: { ...st.messages, [id]: msgs }, error: null }));
      await get().refreshPermissions();
      await get().refreshActiveModel();
    } catch (e) {
      set({ error: String(e) });
    }
  },

  closeSession: async (id) => {
    const c = get().client;
    if (!c) return;
    try {
      await c.deleteSession(id);
      set((st) => ({
        sessions: st.sessions.filter((s) => s.id !== id),
        activeId: st.activeId === id ? null : st.activeId,
      }));
    } catch (e) {
      set({ error: String(e) });
    }
  },

  sendPrompt: async (text) => {
    const c = get().client;
    const id = get().activeId;
    if (!c || !id || !text.trim()) return;
    set({ busy: true, streaming: true, error: null });
    useApp.getState().pushActivity('info', 'sesion', `▶ ${text.slice(0, 120)}`);
    try {
      await c.sendPrompt(id, text);
      // El stream llega por SSE; releer tras una ventana para consolidar.
      await new Promise((r) => setTimeout(r, 1500));
      const msgs = await c.listMessages(id);
      set((st) => ({ messages: { ...st.messages, [id]: msgs } }));
      const last = msgs[msgs.length - 1];
      if (last) useApp.getState().pushActivity('info', 'sesion', `◀ ${partsText(last).slice(0, 200) || '(sin texto)'}`);
    } catch (e) {
      set({ error: String(e) });
    } finally {
      set({ busy: false, streaming: false });
    }
  },

  refreshPermissions: async () => {
    const c = get().client;
    const id = get().activeId;
    if (!c || !id) return;
    try {
      set({ permissions: await c.listPermissions(id) });
    } catch {
      /* sesión sin permisos pendientes o cerrada */
    }
  },

  replyPermission: async (requestId, decision) => {
    const c = get().client;
    const id = get().activeId;
    if (!c || !id) return;
    try {
      await c.replyPermission(id, requestId, decision);
      useApp.getState().pushActivity('info', 'permisos', `${decision === 'allow' ? 'Aprobado' : 'Rechazado'}: ${requestId}`);
      await get().refreshPermissions();
    } catch (e) {
      set({ error: String(e) });
    }
  },
}));

export { partsText };
