import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { createClient, type OpenCodeClient, type PermissionRequest, type SessionMessage, type SessionSummary, type ModelInfo, type FormDetail } from '../lib/opencode';
import { eventToFeed, trackToolCall, type FeedItem, type TrackedCall } from '../lib/activity';
import { useApp } from './app';

/** Chat guardado en el equipo (persiste al cerrar la app; el servidor no). */
export interface ArchivedChat {
  id: string;
  title: string;
  updatedAt: number;
  modelLabel: string | null;
  messages: SessionMessage[];
}

function dirHash(dir: string): string {
  let h = 5381;
  for (let i = 0; i < dir.length; i++) h = ((h << 5) + h + dir.charCodeAt(i)) >>> 0;
  return h.toString(16).padStart(8, '0');
}

interface SessionsState {
  client: OpenCodeClient | null;
  cwd: string | null;
  sessions: SessionSummary[];
  activeId: string | null;
  messages: Record<string, SessionMessage[]>;
  archived: ArchivedChat[];
  archivedId: string | null;
  forms: FormDetail[];
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
  loadArchived: (dir: string) => Promise<void>;
  viewArchived: (id: string) => void;
  continueArchived: () => Promise<void>;
  refreshForms: () => Promise<void>;
  replyForm: (formId: string, answer: Record<string, unknown>) => Promise<void>;
  cancelForm: (formId: string) => Promise<void>;
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

/** Fusión del historial (pura y testeada): el más reciente primero, sin
 * duplicados por id, tope de chats. */
export function mergeArchived(prev: ArchivedChat[], entry: ArchivedChat, cap = 20): ArchivedChat[] {
  return [entry, ...prev.filter((c) => c.id !== entry.id)].slice(0, Math.max(1, cap));
}

/** Firma barata para detectar cambios sin comparar objetos enteros. */
export function messagesSig(arr: SessionMessage[]): string {
  if (arr.length === 0) return '0';
  const last = JSON.stringify(arr[arr.length - 1]);
  return `${arr.length}:${last.length}:${last.slice(-200)}`;
}

/** Lazo de refresco continuo del chat (500 ms). El SSE puede cortarse o
 * tardar; el polling garantiza ver qué hace el modelo, los permisos y los
 * forms sin depender de un solo reintento. */
let pollTimer: ReturnType<typeof setInterval> | null = null;
let pollTick = 0;

function ensurePoll() {
  if (pollTimer) return;
  pollTimer = setInterval(() => {
    void (async () => {
      try {
        const { client, activeId, archivedId, busy, streaming } = useSessions.getState();
        if (!client || !activeId || archivedId) return;
        pollTick++;
        const msgs = await client.listMessages(activeId);
        const st = useSessions.getState();
        const prev = st.messages[activeId] ?? [];
        if (messagesSig(prev) !== messagesSig(msgs)) {
          useSessions.setState({ messages: { ...st.messages, [activeId]: msgs } });
          void persistActive();
        }
        // Permisos y forms: críticos para aprobar a tiempo; cada ~2 s o si hay actividad.
        if (pollTick % 4 === 0 || busy || streaming) {
          await useSessions.getState().refreshPermissions().catch(() => {});
          await useSessions.getState().refreshForms().catch(() => {});
        }
      } catch {
        /* transitorio: el siguiente tick reintenta */
      }
    })();
  }, 500);
}

function stopPoll() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

/** Guarda la sesión activa en el equipo (topes: 20 chats/dir, 120 mensajes).
 * Best-effort y silencioso: jamás rompe el flujo del chat. */
async function persistActive() {
  try {
    const { cwd, activeId, archivedId, sessions, messages, activeModel } = useSessions.getState();
    if (!cwd || !activeId || archivedId) return;
    const msgs = messages[activeId];
    if (!msgs || msgs.length === 0) return;
    const meta = sessions.find((s) => s.id === activeId);
    const am = activeModel;
    const entry: ArchivedChat = {
      id: activeId,
      title: meta?.title || activeId.slice(0, 8),
      updatedAt: Date.now(),
      modelLabel: am ? `${am.providerID}/${am.id}${am.variant ? ` · ${am.variant}` : ''}` : null,
      messages: msgs.slice(-120),
    };
    const key = `chat.${dirHash(cwd)}`;
    let prev: ArchivedChat[] = [];
    try {
      const raw = await invoke<{ chats?: ArchivedChat[] } | null>('settings_get', { key });
      if (raw && Array.isArray(raw.chats)) prev = raw.chats;
    } catch { /* sin archivo previo */ }
    const next = mergeArchived(prev, entry);
    await invoke('settings_set', { key, value: { chats: next } });
  } catch { /* persistencia silenciosa */ }
}

export const useSessions = create<SessionsState>((set, get) => ({
  client: null,
  cwd: null,
  sessions: [],
  activeId: null,
  messages: {},
  archived: [],
  archivedId: null,
  forms: [],
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
          get().refreshForms().catch(() => {});
        }
      }
      // El modelo puede pedir una elección en cualquier momento.
      if (typeof e.type === 'string' && e.type.toLowerCase().includes('form')) {
        get().refreshForms().catch(() => {});
      }
    });
    set({ client, sseOff: off, error: null });
    get().fetchModels().catch(() => {});
    ensurePoll();
    const dir = get().cwd;
    if (dir) get().loadArchived(dir).catch(() => {});
  },

  setCwd: (dir) => {
    set({ cwd: dir, activeId: null, messages: {}, permissions: [], feed: [], calls: {}, usage: null, archived: [], archivedId: null, forms: [] });
    if (dir) {
      get().loadSessions(dir).catch(() => {});
      get().loadArchived(dir).catch(() => {});
    }
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
    stopPoll();
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
      set((st) => ({ sessions: [s, ...st.sessions], activeId: s.id, archivedId: null, forms: [], busy: false }));
      await get().selectSession(s.id);
    } catch (e) {
      set({ busy: false, error: String(e) });
    }
  },

  selectSession: async (id) => {
    const c = get().client;
    if (!c) return;
    set({ activeId: id, archivedId: null });
    try {
      const msgs = await c.listMessages(id);
      set((st) => ({ messages: { ...st.messages, [id]: msgs }, error: null }));
      await get().refreshPermissions();
      await get().refreshActiveModel();
      await get().refreshForms();
      void persistActive();
    } catch (e) {
      set({ error: String(e) });
    }
  },

  closeSession: async (id) => {
    const c = get().client;
    if (!c) return;
    try {
      // El historial queda guardado en el equipo aunque se cierre la sesión.
      if (id === get().activeId) await persistActive();
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
      void persistActive();
      await get().refreshPermissions().catch(() => {});
      await get().refreshForms().catch(() => {});
      const last = msgs[msgs.length - 1];
      if (last) useApp.getState().pushActivity('info', 'sesion', `◀ ${partsText(last).slice(0, 200) || '(sin texto)'}`);
    } catch (e) {
      set({ error: String(e) });
    } finally {
      set({ busy: false, streaming: false });
    }
  },

  loadArchived: async (dir) => {
    try {
      const raw = await invoke<{ chats?: ArchivedChat[] } | null>('settings_get', { key: `chat.${dirHash(dir)}` });
      const chats = raw && Array.isArray(raw.chats) ? raw.chats : [];
      const live = new Set(get().sessions.map((s) => s.id));
      set({ archived: chats.filter((c) => c && typeof c.id === 'string' && !live.has(c.id)), archivedId: null });
    } catch {
      set({ archived: [] });
    }
  },

  viewArchived: (id) => {
    const a = get().archived.find((c) => c.id === id);
    if (!a) return;
    set((st) => ({ activeId: id, archivedId: id, forms: [], messages: { ...st.messages, [id]: a.messages } }));
  },

  continueArchived: async () => {
    const a = get().archived.find((c) => c.id === get().archivedId);
    await get().createSession(a ? `${a.title} (cont.)` : undefined);
  },

  refreshForms: async () => {
    const c = get().client;
    const id = get().activeId;
    if (!c || !id || get().archivedId) {
      if (!id) set({ forms: [] });
      return;
    }
    try {
      const list = await c.listForms(id);
      const details: FormDetail[] = [];
      for (const f of list.slice(-5)) {
        try {
          details.push(await c.getForm(id, f.id));
        } catch {
          details.push(f);
        }
      }
      set({ forms: details });
    } catch {
      /* sin forms o sesión cerrada */
    }
  },

  replyForm: async (formId, answer) => {
    const c = get().client;
    const id = get().activeId;
    if (!c || !id) return;
    set({ busy: true, error: null });
    try {
      await c.replyForm(id, formId, answer);
      await get().refreshForms();
      await get().selectSession(id);
    } catch (e) {
      set({ error: String(e) });
    } finally {
      set({ busy: false });
    }
  },

  cancelForm: async (formId) => {
    const c = get().client;
    const id = get().activeId;
    if (!c || !id) return;
    try {
      await c.cancelForm(id, formId);
      await get().refreshForms();
    } catch (e) {
      set({ error: String(e) });
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
