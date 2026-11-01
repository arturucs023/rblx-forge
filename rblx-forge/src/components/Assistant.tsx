import { useEffect, useState } from 'react';
import { useSessions } from '../stores/sessions';
import type { MessagePart, SessionMessage } from '../lib/opencode';
import { sessionTotals, formatTokens, formatCost, EMPTY_MSGS } from '../lib/session-stats';
import type { ModelInfo } from '../lib/opencode';
import { useApp } from '../stores/app';

function costLabel(m: ModelInfo): string {
  const c = m.cost?.[0];
  if (!c) return 'coste n/d';
  const inp = typeof c.input === 'number' ? c.input : null;
  const out = typeof c.output === 'number' ? c.output : null;
  if (inp === 0 && out === 0) return 'gratis';
  const f = (v: number | null) => (v === null ? '?' : `$${v}`);
  return `${f(inp)}/${f(out)} por 1M tokens`;
}

import { getVariants, variantHint } from '../lib/model-variants';

function ModelBar() {
  const { activeId, models, defaultModel, activeModel, switchModel, busy } = useSessions();
  const [open, setOpen] = useState(false);
  const [changingVariant, setChangingVariant] = useState(false);
  if (!activeId) return null;
  const current = activeModel
    ? models.find((m) => m.id === activeModel.id && m.providerID === activeModel.providerID)
    : null;
  const variants = getVariants(current);
  const byProvider = new Map<string, ModelInfo[]>();
  for (const m of models) {
    const arr = byProvider.get(m.providerID) ?? [];
    arr.push(m);
    byProvider.set(m.providerID, arr);
  }
  const changeVariant = async (v: string) => {
    if (!activeModel) return;
    setChangingVariant(true);
    try {
      await switchModel({ providerID: activeModel.providerID, id: activeModel.id, variant: v || undefined });
    } finally {
      setChangingVariant(false);
    }
  };
  return (
    <div className="anim-fade mb-2.5 rounded-xl border border-forge-border bg-forge-panel px-3 py-2">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="section-label">Modelo</span>
        <span className="mono text-[12px] font-bold text-forge-accent">
          {activeModel ? `${activeModel.providerID}/${activeModel.id}` : '(cargando…)'}
        </span>
        {activeModel?.variant && <span className="pill pill-ok">{activeModel.variant}</span>}
        {current && <span className="pill pill-neutral">{current.name}</span>}
        {current && <span className="mono text-[11px] text-forge-muted">{costLabel(current)}</span>}
      {!current && defaultModel && (
        <span className="text-[11px] text-forge-muted">defecto: {defaultModel.providerID}/{defaultModel.id}</span>
      )}
      <button onClick={() => setOpen((v) => !v)} disabled={busy || models.length === 0} className="btn btn-ghost ml-auto !py-0.5 !text-[11px] disabled:opacity-50">
        Cambiar ▾
      </button>
      </div>
      {open && (
        <select
          className="input mt-2 w-full"
          value={activeModel ? `${activeModel.providerID}\n${activeModel.id}` : ''}
          onChange={(e) => {
            const [providerID, id] = e.target.value.split('\n');
            if (providerID && id) switchModel({ providerID, id });
            setOpen(false);
          }}
        >
          <option value="">Elegir modelo… ({models.length} disponibles)</option>
          {[...byProvider.entries()].map(([prov, list]) => (
            <optgroup key={prov} label={prov}>
              {list.map((m) => {
                const n = getVariants(m).length;
                return (
                  <option key={`${prov}\n${m.id}`} value={`${prov}\n${m.id}`}>
                    {m.name || m.id} · {costLabel(m)}{n ? ` · ${n} variantes` : ''}
                  </option>
                );
              })}
            </optgroup>
          ))}
        </select>
      )}
      {variants.length > 0 && activeModel && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="section-label">Variante</span>
          <select
            className="input min-w-40 flex-1"
            value={activeModel.variant ?? ''}
            disabled={busy || changingVariant}
            onChange={(e) => changeVariant(e.target.value)}
            title={variantHint(variants.length)}
          >
            <option value="">Por defecto del servidor</option>
            {variants.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
      )}
      <div className="mt-1 w-full text-[10px] leading-4 text-forge-faint">
        El plan y la facturación los gestiona OpenCode; aquí eliges qué modelo usa cada sesión. Revisa el coste antes de tareas largas.
      </div>
    </div>
  );
}

export function Assistant() {
  const { client, sessions, activeId, messages, permissions, busy, streaming, error, assistantDraft, setAssistantDraft } = useSessions();
  const [draft, setDraft] = useState('');
  const st = useSessions.getState();

  useEffect(() => {
    if (assistantDraft) {
      setDraft(assistantDraft);
      setAssistantDraft(null);
    }
  }, [assistantDraft, setAssistantDraft]);

  if (!client) {
    return (
      <div className="p-4 text-forge-muted">
        <p className="mb-2 font-bold text-forge-text">Asistente IA (OpenCode)</p>
        <p>Sin conexión. Pulsa «Conectar OpenCode» en la barra superior.</p>
        <p className="mt-2 text-[12px]">
          RBLX Forge no implementa chatbot propio: toda la IA pasa por el servidor OpenCode gestionado.
        </p>
      </div>
    );
  }

  const msgs = activeId ? (messages[activeId] ?? EMPTY_MSGS) : EMPTY_MSGS;

  const send = async () => {
    const text = draft.trim();
    if (!text || busy) return;
    setDraft('');
    await st.sendPrompt(text);
  };

  return (
    <div className="flex h-full">
      {/* Lista de sesiones */}
      <div className="flex w-56 shrink-0 flex-col border-r border-forge-border-soft bg-forge-panel">
        <div className="flex items-center justify-between px-2.5 pb-1.5 pt-2.5">
          <span className="section-label">Sesiones</span>
          <button
            onClick={() => st.createSession()}
            disabled={busy}
            className="btn btn-ghost !px-2 !py-0.5 !text-[11px] disabled:opacity-50"
            title="Crear sesión en el directorio del proyecto"
          >
            + Nueva
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {sessions.length === 0 && <p className="px-1 text-[12px] text-forge-faint">Sin sesiones. Crea la primera.</p>}
          {sessions.map((s) => (
            <div
              key={s.id}
              className={`anim-fade mb-1.5 rounded-lg border p-2 transition-colors ${
                s.id === activeId ? 'border-forge-accent-dim bg-forge-accent-soft' : 'border-forge-border-soft hover:border-forge-border'
              }`}
            >
              <button onClick={() => st.selectSession(s.id)} className="block w-full truncate text-left text-[12.5px] font-semibold" title={s.id}>
                {s.title || s.id.slice(0, 8)}
              </button>
              <div className="mono mt-0.5 truncate text-[10px] text-forge-faint">{s.id.slice(0, 13)}…</div>
              {s.id === activeId && (
                <button
                  onClick={() => st.closeSession(s.id)}
                  className="mt-1 text-[11px] text-forge-faint hover:text-forge-err"
                >
                  Cerrar sesión
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Conversación */}
      <div className="flex min-w-0 flex-1 flex-col">
        <ModelBar />
        {permissions.length > 0 && (
          <div className="anim-fade mb-2 rounded-xl border border-forge-warn/40 bg-forge-warn-soft p-2.5">
            <p className="mb-1.5 text-[12px] font-bold text-forge-warn">
              🔑 Permisos pendientes ({permissions.length}) — OpenCode espera tu decisión
            </p>
            {permissions.map((p) => (
              <div key={p.id} className="mb-1 flex items-center gap-2 text-[12px]">
                <span className="mono min-w-0 flex-1 truncate" title={(p.resources ?? []).join(', ')}>
                  {p.action} · {(p.resources ?? []).join(', ')}
                </span>
                <button
                  onClick={() => st.replyPermission(p.id, 'allow')}
                  className="btn border-forge-ok text-forge-ok hover:bg-forge-ok-soft"
                >
                  ✓ Aprobar
                </button>
                <button
                  onClick={() => st.replyPermission(p.id, 'deny')}
                  className="btn btn-danger"
                >
                  Rechazar
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-1">
          {!activeId && (
            <div className="anim-enter mx-auto mt-10 max-w-md rounded-xl border border-dashed border-forge-border bg-forge-panel p-6 text-center">
              <div className="mb-1 text-2xl">✦</div>
              <p className="font-bold">Sin sesión activa</p>
              <p className="mt-1 text-[12px] text-forge-muted">Crea una sesión para empezar a trabajar con OpenCode en el directorio del proyecto.</p>
            </div>
          )}
          {msgs.map((m) => <ChatMessage key={m.id} m={m} />)}
          {streaming && <p className="animate-pulse py-1 text-forge-accent">▸ Recibiendo respuesta…</p>}
          {error && <p className="text-forge-err">Error: {error}</p>}
        </div>

        <div className="border-t border-forge-border-soft bg-forge-panel px-3 pb-2.5 pt-2">
          <div className="flex items-end gap-2 rounded-xl border border-forge-border bg-forge-bg p-1.5 pl-3 transition-colors focus-within:border-forge-accent-dim">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder={activeId ? 'Escribe un mensaje… (Enter para enviar)' : 'Crea una sesión primero'}
              disabled={!activeId || busy}
              className="min-w-0 flex-1 bg-transparent py-1 outline-none placeholder:text-forge-faint disabled:opacity-50"
            />
            <button
              onClick={send}
              disabled={!activeId || busy || !draft.trim()}
              className="btn btn-primary"
            >
              Enviar ⏎
            </button>
          </div>
        </div>
        <StatusLine />
      </div>
    </div>
  );
}

function StatusLine() {
  const err = useApp((s) => s.error);
  const activeId = useSessions((s) => s.activeId);
  // Referencia estable: un [] nuevo en cada snapshot provocaba re-renders
  // en cascada con cada evento SSE ("Maximum update depth exceeded").
  const messages = useSessions((s) => (activeId ? (s.messages[activeId] ?? EMPTY_MSGS) : EMPTY_MSGS));
  const totals = sessionTotals(messages);
  const hasUsage = totals.messages > 0 && (totals.input > 0 || totals.output > 0);
  return (
    <div className="flex items-center gap-2 border-t border-forge-border-soft bg-forge-panel px-3 py-1 text-[11px] text-forge-muted">
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${err ? 'bg-forge-err' : totals.messages > 0 ? 'bg-forge-ok' : 'bg-forge-faint'}`} />
      <span className="truncate">{err ? `Error: ${err}` : totals.messages > 0 ? `${totals.messages} mensajes` : 'Listo.'}</span>
      {hasUsage && (
        <span className="pill pill-neutral mono ml-auto !py-0" title="Tokens consumidos en esta sesión (suma real de los mensajes)">
          ⬆{formatTokens(totals.input)} ⬇{formatTokens(totals.output)} · {formatCost(totals.cost)}
        </span>
      )}
    </div>
  );
}

/** Una fila de herramienta: compacta, con estado. Sin placeholdes. */
function ToolRow({ part }: { part: MessagePart }) {
  const state = (part && typeof part === 'object' ? (part.state ?? {}) : {}) as { status?: string; input?: unknown };
  const ok = state.status === 'completed';
  const input = state.input && typeof state.input === 'object' ? (state.input as Record<string, unknown>) : null;
  const where = input ? Object.values(input).filter((v) => typeof v === 'string').slice(0, 1).join(' ') : '';
  const name = (part as { name?: unknown }).name;
  return (
    <div className="mono mb-1.5 inline-block max-w-full break-words rounded-lg border border-forge-border-soft bg-forge-bg px-2 py-1 text-[11px]">
      <span className={ok ? 'text-forge-ok' : 'text-forge-accent'}>{ok ? '✓' : '…'} {typeof name === 'string' && name ? name : part?.type ?? '?'}</span>
      {where && <span className="ml-2 text-forge-faint">{String(where).slice(0, 120)}</span>}
    </div>
  );
}

/** Mensaje de chat: solo lo visible. Sin contenido visible → no se pinta. */
function ChatMessage({ m }: { m: SessionMessage }) {
  if (!m || typeof m !== 'object') return null;
  if (m.type === 'user' || m.role === 'user') {
    if (typeof m.text !== 'string' || !m.text.trim()) return null;
    return (
      <div className="anim-enter mb-2.5 ml-auto max-w-3xl">
        <pre className="whitespace-pre-wrap rounded-2xl rounded-br-md bg-forge-accent px-3.5 py-2 text-[12.5px] font-medium leading-relaxed text-[#141414]">{m.text}</pre>
      </div>
    );
  }
  const parts = Array.isArray(m.content) ? m.content : Array.isArray(m.parts) ? m.parts : [];
  const texts = parts.filter((p) => p && typeof p === 'object' && p.type === 'text' && typeof p.text === 'string' && p.text.trim());
  const tools = parts.filter((p) => p && typeof p === 'object' && (p.type === 'tool' || typeof (p as { name?: unknown }).name === 'string'));
  if (texts.length === 0 && tools.length === 0) return null; // reasoning puro: va en Actividad, no ensucia el chat
  const t = (m.tokens ?? {}) as { input?: number; output?: number };
  const hasMeta = typeof t.input === 'number' || typeof t.output === 'number' || typeof m.cost === 'number';
  return (
    <div className="anim-enter mb-2.5 max-w-3xl">
      <div className="mb-1 flex items-center gap-1.5 text-[11px]">
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-forge-accent-soft text-[11px] text-forge-accent">✦</span>
        <span className="font-semibold text-forge-muted">{m.agent ? `asistente · ${m.agent}` : 'asistente'}</span>
      </div>
      {tools.map((p, i) => <ToolRow key={i} part={p} />)}
      {texts.map((p, i) => (
        <pre key={i} className="whitespace-pre-wrap rounded-2xl rounded-bl-md border border-forge-border bg-forge-panel2 px-3.5 py-2 text-[12.5px] leading-relaxed">{p.text}</pre>
      ))}
      {hasMeta && (
        <div className="mono mt-1 text-[10px] text-forge-faint">
          {typeof t.input === 'number' && <span title="Tokens de entrada">⬆{formatTokens(t.input)} </span>}
          {typeof t.output === 'number' && <span title="Tokens de salida">⬇{formatTokens(t.output)} </span>}
          {typeof m.cost === 'number' && <span title="Coste estimado">{formatCost(m.cost)}</span>}
        </div>
      )}
    </div>
  );
}
