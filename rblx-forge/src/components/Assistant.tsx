import { useEffect, useRef, useState } from 'react';
import { useSessions } from '../stores/sessions';
import type { FormDetail, MessagePart, SessionMessage } from '../lib/opencode';
import { sessionTotals, formatTokens, formatCost, EMPTY_MSGS } from '../lib/session-stats';
import { defaultValues, isSingleChoice, validateAnswer, type FieldValues } from '../lib/forms';
import { openUrl } from '@tauri-apps/plugin-opener';
import { useApp } from '../stores/app';
import { ModelPicker } from './ModelPicker';

function ModelBar() {
  const { activeId, models, defaultModel, activeModel, switchModel, busy } = useSessions();
  const [changing, setChanging] = useState(false);
  if (!activeId) return null;
  const current = activeModel
    ? models.find((m) => m.id === activeModel.id && m.providerID === activeModel.providerID)
    : null;
  return (
    <div className="anim-fade mb-2.5 rounded-xl border border-forge-border bg-forge-panel px-3 py-2">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="section-label">Modelo</span>
      </div>
      <ModelPicker
        value={activeModel}
        disabled={busy || changing}
        onChange={async (v) => {
          if (!v) return;
          setChanging(true);
          try {
            await switchModel(v);
          } finally {
            setChanging(false);
          }
        }}
      />
      {!current && !activeModel && defaultModel && (
        <span className="text-[11px] text-forge-muted">defecto: {defaultModel.providerID}/{defaultModel.id}</span>
      )}
      <div className="mt-1 w-full text-[10px] leading-4 text-forge-faint">
        El plan y la facturación los gestiona OpenCode; aquí eliges qué modelo usa cada sesión. Revisa el coste antes de tareas largas.
      </div>
    </div>
  );
}

export function Assistant() {
  const { client, sessions, activeId, messages, permissions, busy, streaming, error, assistantDraft, setAssistantDraft, archived, archivedId, forms } = useSessions();
  const [draft, setDraft] = useState('');
  const st = useSessions.getState();
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);

  const msgs = activeId ? (messages[activeId] ?? EMPTY_MSGS) : EMPTY_MSGS;
  const liveIds = new Set(sessions.map((s) => s.id));
  const saved = archived.filter((a) => !liveIds.has(a.id));
  const isFresh = !archivedId && msgs.length === 0;

  useEffect(() => {
    if (assistantDraft) {
      setDraft(assistantDraft);
      setAssistantDraft(null);
    }
  }, [assistantDraft, setAssistantDraft]);

  // Auto-scroll: sigue al chat solo si ya estabas abajo (no te arranca del historial).
  // Va ANTES de cualquier return: los hooks deben ejecutarse siempre en el mismo orden (React #310).
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [msgs, streaming]);

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

  const send = async () => {
    const text = draft.trim();
    if (!text || busy || archivedId) return;
    setDraft('');
    await st.sendPrompt(text);
  };

  // Auto-scroll: sigue al chat solo si ya estabas abajo (no te arranca del historial).
  const onScroll = () => {
    const el = scrollRef.current;
    if (el) stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
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
          {sessions.length === 0 && saved.length === 0 && <p className="px-1 text-[12px] text-forge-faint">Sin sesiones. Crea la primera.</p>}
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
          {saved.length > 0 && (
            <>
              <p className="section-label px-1 pb-1 pt-2">Guardados en este equipo</p>
              {saved.map((a) => (
                <div
                  key={a.id}
                  className={`anim-fade mb-1.5 rounded-lg border border-dashed p-2 transition-colors ${
                    a.id === activeId ? 'border-forge-accent-dim bg-forge-accent-soft' : 'border-forge-border-soft hover:border-forge-border'
                  }`}
                >
                  <button onClick={() => st.viewArchived(a.id)} className="block w-full truncate text-left text-[12px] font-semibold" title={a.id}>
                    {a.title}
                  </button>
                  <div className="mono mt-0.5 truncate text-[10px] text-forge-faint">
                    {new Date(a.updatedAt).toLocaleString()}{a.modelLabel ? ` · ${a.modelLabel}` : ''}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Conversación */}
      <div className="flex min-w-0 flex-1 flex-col">
        <ModelBar />
        {permissions.length > 0 && (          <div className="anim-fade mb-2 rounded-xl border border-forge-warn/40 bg-forge-warn-soft p-2.5">
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

        {forms.filter((f) => f.state?.status === 'pending').map((f) => (
          <FormCard key={f.id} form={f} />
        ))}
        {forms.filter((f) => f.state?.status !== 'pending').slice(-3).map((f) => (
          <FormCard key={f.id} form={f} />
        ))}
        {archivedId && (
          <div className="anim-fade mb-2 flex items-center gap-2 rounded-xl border border-dashed border-forge-border bg-forge-panel px-3 py-2 text-[12px] text-forge-muted">
            <span>Chat guardado. Sigue hablando: se abre una sesión nueva con el resumen.</span>
            <button onClick={() => st.continueArchived()} disabled={busy} className="btn btn-primary ml-auto !py-1 disabled:opacity-50">
              Continuar hablando
            </button>
          </div>
        )}
        <div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto px-3 py-1">
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
          {isFresh && !streaming && !error && (
            <div className="anim-enter mx-auto mt-6 max-w-md rounded-xl border border-dashed border-forge-border bg-forge-panel p-4 text-center">
              <p className="mb-2 text-[12px] font-bold text-forge-muted">Prueba con…</p>
              <div className="flex flex-col gap-1.5">
                {[
                  'Explica la estructura de este proyecto y qué hace cada carpeta',
                  'Crea un ModuleScript de ejemplo con una función documentada',
                  '¿Qué modelo estás usando y con qué variante?',
                ].map((s) => (
                  <button
                    key={s}
                    onClick={() => { setDraft(s); setAssistantDraft(s); }}
                    disabled={!activeId || busy}
                    className="rounded-lg border border-forge-border-soft px-2.5 py-1.5 text-left text-[12px] text-forge-muted transition-colors hover:border-forge-accent-dim hover:text-forge-text disabled:opacity-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-forge-border-soft bg-forge-panel px-3 pb-2.5 pt-2">
          <div className="flex items-end gap-2 rounded-xl border border-forge-border bg-forge-bg p-1.5 pl-3 transition-colors focus-within:border-forge-accent-dim">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder={archivedId ? 'Chat guardado: pulsa «Continuar hablando»' : activeId ? 'Escribe un mensaje… (Enter para enviar)' : 'Crea una sesión primero'}
              disabled={!activeId || busy || !!archivedId}
              className="min-w-0 flex-1 bg-transparent py-1 outline-none placeholder:text-forge-faint disabled:opacity-50"
            />
            {(busy || streaming) ? (
              <button
                onClick={() => st.interruptActive()}
                title="Detener respuesta"
                className="btn btn-danger !px-3.5"
              >
                ■
              </button>
            ) : (
              <button
                onClick={send}
                disabled={!activeId || !draft.trim() || !!archivedId}
                className="btn btn-primary"
              >
                Enviar ⏎
              </button>
            )}
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

/** Bloque colapsable de ejecución: cuenta lo que corre sin desplegarlo todo. */
function ExecBlock({ tools }: { tools: MessagePart[] }) {
  const running = tools.filter((p) => {
    const st = (p && typeof p === 'object' ? ((p as { state?: unknown }).state ?? {}) : {}) as { status?: unknown };
    return st.status !== 'completed';
  }).length;
  const [open, setOpen] = useState<boolean | null>(null);
  const shown = open ?? running > 0;
  return (
    <div className="mb-1.5 max-w-full rounded-lg border border-forge-border-soft bg-forge-bg">
      <button
        onClick={() => setOpen((v) => !(v ?? running > 0))}
        className="mono flex w-full items-center gap-1.5 px-2 py-1 text-left text-[11px] text-forge-muted hover:text-forge-text"
      >
        <span className="text-forge-accent">{shown ? '▾' : '▸'}</span>
        {running > 0 ? (
          <span><span className="dot-live mr-1 inline-block h-1.5 w-1.5 rounded-full bg-forge-accent" />Ejecutando ({tools.length - running}/{tools.length})…</span>
        ) : (
          <span className="text-forge-ok">✓ {tools.length} {tools.length === 1 ? 'acción' : 'acciones'}</span>
        )}
      </button>
      {shown && (
        <div className="px-1 pb-1">
          {tools.map((p, i) => <ToolRow key={i} part={p} />)}
        </div>
      )}
    </div>
  );
}

/** El modelo propone, tú eliges: opciones, sí/no, texto o número. */
function FormCard({ form }: { form: FormDetail }) {
  const st = useSessions.getState();
  const busy = useSessions((s) => s.busy);
  const [values, setValues] = useState<FieldValues>(() => defaultValues(form.fields));
  const [errs, setErrs] = useState<string[]>([]);
  useEffect(() => {
    setValues(defaultValues(form.fields));
    setErrs([]);
  }, [form.id]);
  const pending = form.state?.status === 'pending';

  if (!pending) {
    return (
      <div className="anim-fade mb-2 rounded-xl border border-forge-border-soft px-3 py-1.5 text-[12px] text-forge-faint">
        ☑ {form.title} — {form.state?.status === 'answered' ? 'respondido' : 'omitido'}
      </div>
    );
  }

  const set = (key: string, v: string | number | boolean | string[]) =>
    setValues((prev) => ({ ...prev, [key]: v }));

  const submit = async () => {
    const problems = validateAnswer(form.fields, values);
    setErrs(problems);
    if (problems.length) return;
    const answer: Record<string, unknown> = {};
    for (const f of form.fields) {
      if (f.hidden) continue;
      if (values[f.key] !== undefined) answer[f.key] = values[f.key];
    }
    await st.replyForm(form.id, answer);
  };

  return (
    <div className="anim-enter mb-2 rounded-xl border border-forge-accent-dim bg-forge-accent-soft px-3 py-2.5">
      <p className="mb-0.5 text-[13px] font-bold">❓ {form.title}</p>
      <p className="mb-2 text-[11px] text-forge-muted">El modelo te pide elegir para continuar.</p>
      {(form.fields ?? []).filter((f) => !f.hidden).map((f) => (
        <div key={f.key} className="mb-2">
          {(f.title || f.description) && (
            <p className="mb-1 text-[12px] font-semibold">
              {f.title || f.key}
              {f.required && <span className="text-forge-err"> *</span>}
              {f.description && <span className="ml-1 font-normal text-forge-muted">{f.description}</span>}
            </p>
          )}
          {f.type === 'multiselect' && isSingleChoice(f) && (
            <div className="flex flex-col gap-1">
              {(f.options ?? []).map((o) => {
                const sel = values[f.key] === o.value || (Array.isArray(values[f.key]) && (values[f.key] as string[])[0] === o.value);
                return (
                  <button
                    key={o.value}
                    onClick={() => set(f.key, o.value)}
                    className={`rounded-lg border px-2.5 py-1.5 text-left text-[12px] transition-colors ${sel ? 'border-forge-accent bg-forge-panel3 font-bold text-forge-accent' : 'border-forge-border hover:border-forge-accent-dim'}`}
                    title={o.description}
                  >
                    {o.label}
                    {o.description && <span className="block text-[11px] font-normal text-forge-muted">{o.description}</span>}
                  </button>
                );
              })}
            </div>
          )}
          {f.type === 'multiselect' && !isSingleChoice(f) && (
            <div className="flex flex-col gap-1">
              {(f.options ?? []).map((o) => {
                const arr = Array.isArray(values[f.key]) ? (values[f.key] as string[]) : [];
                const sel = arr.includes(o.value);
                return (
                  <button
                    key={o.value}
                    onClick={() => set(f.key, sel ? arr.filter((v) => v !== o.value) : [...arr, o.value])}
                    className={`rounded-lg border px-2.5 py-1.5 text-left text-[12px] transition-colors ${sel ? 'border-forge-accent bg-forge-panel3 font-bold text-forge-accent' : 'border-forge-border hover:border-forge-accent-dim'}`}
                    title={o.description}
                  >
                    {sel ? '☑ ' : '☐ '}{o.label}
                    {o.description && <span className="block text-[11px] font-normal text-forge-muted">{o.description}</span>}
                  </button>
                );
              })}
            </div>
          )}
          {f.type === 'boolean' && (
            <div className="flex gap-1">
              {[{ v: true, l: 'Sí' }, { v: false, l: 'No' }].map(({ v, l }) => (
                <button
                  key={l}
                  onClick={() => set(f.key, v)}
                  className={`btn ${values[f.key] === v ? 'btn-primary' : 'btn-ghost'}`}
                >
                  {l}
                </button>
              ))}
            </div>
          )}
          {(f.type === 'string' || f.type === 'number' || f.type === 'integer' || !f.type) && (
            <input
              value={typeof values[f.key] === 'string' || typeof values[f.key] === 'number' ? String(values[f.key]) : ''}
              onChange={(e) => {
                const raw = e.target.value;
                set(f.key, f.type === 'number' || f.type === 'integer' ? (raw.trim() === '' ? '' : Number(raw)) : raw);
              }}
              type={f.type === 'number' || f.type === 'integer' ? 'number' : 'text'}
              placeholder={f.title || f.key}
              className="input w-full"
            />
          )}
          {f.type === 'external' && (
            <button onClick={() => f.url && openUrl(f.url).catch(() => {})} className="btn btn-ghost" title={f.url}>
              Abrir recurso externo ↗
            </button>
          )}
        </div>
      ))}
      {errs.length > 0 && (
        <div className="mb-2 text-[12px] text-forge-err">
          {errs.map((e) => <p key={e}>· {e}</p>)}
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={submit} disabled={busy} className="btn btn-primary disabled:opacity-50">
          Enviar elección
        </button>
        <button onClick={() => st.cancelForm(form.id)} disabled={busy} className="btn btn-ghost disabled:opacity-50">
          Omitir
        </button>
      </div>
    </div>
  );
}
/** Mensaje de chat: solo lo visible. Sin contenido visible → no se pinta. */
function ChatMessage({ m }: { m: SessionMessage }) {
  const modelLabel = useSessions((s) => (s.activeModel ? `${s.activeModel.providerID}/${s.activeModel.id}${s.activeModel.variant ? ` · ${s.activeModel.variant}` : ''}` : null));
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
        <span className="font-semibold text-forge-muted">{modelLabel ?? 'asistente'}</span>
      </div>
      {tools.length > 0 && <ExecBlock tools={tools} />}
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
