// Asistente IA: conversación con OpenCode (único motor). Compone cabecera de
// contexto, mensajes con Markdown real, herramientas con estado, formularios,
// composer con adjuntos y selector de modelo, e historial persistente.
import { useEffect, useRef, useState } from 'react';
import { useSessions } from '../stores/sessions';
import { EMPTY_MSGS } from '../lib/session-stats';
import { Composer, type OutgoingFiles } from './assistant/Composer';
import { EmptyState } from './assistant/EmptyState';
import { FormCard } from './assistant/FormCard';
import { MessageItem } from './assistant/MessageItem';
import { SessionList } from './assistant/SessionList';
import { StatusLine } from './assistant/StatusLine';
import { AssistantHeader } from './assistant/AssistantHeader';

export function Assistant() {
  const { client, sessions, activeId, messages, permissions, busy, streaming, error, assistantDraft, setAssistantDraft, archived, archivedId, forms } = useSessions();
  const activeModel = useSessions((s) => s.activeModel);
  const modelsLoaded = useSessions((s) => s.models.length > 0);
  const [draft, setDraft] = useState('');
  const st = useSessions.getState();
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);
  const [stuck, setStuck] = useState(false);

  const msgs = activeId ? (messages[activeId] ?? EMPTY_MSGS) : EMPTY_MSGS;
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

  const onScroll = () => {
    const el = scrollRef.current;
    if (el) {
      const stuckNow = el.scrollHeight - el.scrollTop - el.clientHeight >= 120;
      stickRef.current = !stuckNow;
      setStuck((prev) => (prev === stuckNow ? prev : stuckNow));
    }
  };

  const jumpToBottom = () => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
      stickRef.current = true;
      setStuck(false);
    }
  };

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

  const send = async (text: string, files: OutgoingFiles[]) => {
    if (archivedId) return;
    await st.sendPrompt(text, files.length ? files.map((f) => ({ uri: f.uri, name: f.name })) : undefined);
  };

  return (
    <div className="flex h-full">
      <div className="w-56 shrink-0">
        <SessionList
          sessions={sessions}
          archived={archived}
          activeId={activeId}
          busy={busy}
          onSelect={(id) => st.selectSession(id)}
          onNew={() => st.createSession()}
          onClose={(id) => st.closeSession(id)}
          onDelete={(id) => st.deleteSession(id)}
          onDeleteArchived={(id) => st.deleteArchived(id)}
          onViewArchived={(id) => st.viewArchived(id)}
          onContinue={() => st.continueArchived()}
        />
      </div>

      {/* Conversación */}
      <div className="flex min-w-0 flex-1 flex-col">
        <AssistantHeader />
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
        <div className="relative min-h-0 flex-1">
          <div ref={scrollRef} onScroll={onScroll} className="h-full overflow-y-auto px-3 py-1">
            {!activeId && (
              <div className="anim-enter mx-auto mt-10 max-w-md rounded-xl border border-dashed border-forge-border bg-forge-panel p-6 text-center">
                <div className="mb-1 text-2xl">✦</div>
                <p className="font-bold">Sin sesión activa</p>
                <p className="mt-1 text-[12px] text-forge-muted">Crea una sesión para empezar a trabajar con OpenCode en el directorio del proyecto.</p>
              </div>
            )}
            {msgs.map((m, i) => (
              <MessageItem
                key={m.id}
                m={m}
                streaming={streaming}
                isLast={i === msgs.length - 1}
                onContinue={() => st.sendPrompt('Continúa')}
              />
            ))}
            {streaming && <p className="animate-pulse py-1 text-forge-accent">▸ Recibiendo respuesta…</p>}
            {error && <p className="text-forge-err">Error: {error}</p>}
            {isFresh && !streaming && !error && <EmptyState onPick={(s) => { setDraft(s); setAssistantDraft(s); }} />}
          </div>
          {stuck && msgs.length > 0 && (
            <button
              onClick={jumpToBottom}
              title="Bajar al último mensaje"
              className="absolute bottom-3 right-5 rounded-full border border-forge-accent-dim bg-forge-panel3 px-2.5 py-1 text-[13px] text-forge-accent shadow-lg transition-transform hover:scale-105"
            >
              ↓
            </button>
          )}
        </div>

        <div className="border-t border-forge-border-soft bg-forge-panel px-3 pb-2.5 pt-2">
          <Composer
            draft={draft}
            setDraft={setDraft}
            onSend={send}
            busy={busy}
            streaming={streaming}
            onInterrupt={() => st.interruptActive()}
            disabled={!activeId || !!archivedId}
            placeholder={archivedId ? 'Chat guardado: pulsa «Continuar hablando»' : activeId ? 'Escribe un mensaje…' : 'Crea una sesión primero'}
            modelValue={activeModel}
            onModelChange={(v) => { if (v) void st.switchModel(v); }}
            modelsReady={modelsLoaded}
          />
        </div>
        <StatusLine />
      </div>
    </div>
  );
}
