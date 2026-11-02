// Lista de sesiones: recientes + guardadas, con búsqueda, fecha y borrado.
// Solo presenta datos del store; no inventa nada.
import { useMemo, useState } from 'react';
import type { ArchivedChat } from '../../stores/sessions';
import type { SessionSummary } from '../../lib/opencode';

function fmtWhen(updatedAt?: string | null, fallbackTs?: number): string {
  const t = fallbackTs ?? (updatedAt ? Date.parse(updatedAt) : NaN);
  if (!t || Number.isNaN(t)) return '';
  return new Date(t).toLocaleString([], { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function SessionList({ sessions, archived, activeId, busy, onSelect, onNew, onClose, onDelete, onDeleteArchived, onViewArchived, onContinue }: {
  sessions: SessionSummary[];
  archived: ArchivedChat[];
  activeId: string | null;
  busy: boolean;
  onSelect: (id: string) => void;
  onNew: () => void;
  onClose: (id: string) => void;
  onDelete: (id: string) => void;
  onDeleteArchived: (id: string) => void;
  onViewArchived: (id: string) => void;
  onContinue: () => void;
}) {
  const [q, setQ] = useState('');
  const needle = q.trim().toLowerCase();
  const live = useMemo(
    () => sessions.filter((s) => !needle || (s.title || s.id).toLowerCase().includes(needle)),
    [sessions, needle],
  );
  const saved = useMemo(
    () => archived.filter((a) => !needle || a.title.toLowerCase().includes(needle)),
    [archived, needle],
  );

  return (
    <div className="flex h-full flex-col border-r border-forge-border-soft bg-forge-panel">
      <div className="px-2 pb-1.5 pt-2.5">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="section-label">Sesiones</span>
          <button
            onClick={onNew}
            disabled={busy}
            className="btn btn-ghost !px-2 !py-0.5 !text-[11px] disabled:opacity-50"
            title="Crear sesión en el directorio del proyecto"
          >
            + Nueva
          </button>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar…"
          className="input w-full !text-[12px]"
        />
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {live.length === 0 && saved.length === 0 && (
          <p className="px-1 text-[12px] text-forge-faint">
            {needle ? 'Sin coincidencias.' : 'Sin sesiones. Crea la primera.'}
          </p>
        )}
        {live.map((s) => (
          <div
            key={s.id}
            className={`anim-fade group mb-1.5 rounded-lg border p-2 transition-colors ${
              s.id === activeId ? 'border-forge-accent-dim bg-forge-accent-soft' : 'border-forge-border-soft hover:border-forge-border'
            }`}
          >
            <button onClick={() => onSelect(s.id)} className="block w-full truncate text-left text-[12.5px] font-semibold" title={s.title || s.id}>
              {s.title || s.id.slice(0, 8)}
            </button>
            <div className="mono mt-0.5 truncate text-[10px] text-forge-faint">
              {fmtWhen(s.updatedAt)}{s.updatedAt ? ' · ' : ''}{s.id.slice(0, 13)}…
            </div>
            <div className="mt-1 flex gap-2">
              {s.id === activeId ? (
                <button onClick={() => onClose(s.id)} className="text-[11px] text-forge-faint hover:text-forge-text" title="Cierra la sesión pero la guarda en este equipo">
                  Cerrar
                </button>
              ) : (
                <button onClick={() => onSelect(s.id)} className="text-[11px] text-forge-faint hover:text-forge-text">
                  Abrir
                </button>
              )}
              <button onClick={() => onDelete(s.id)} className="ml-auto text-[11px] text-forge-faint opacity-0 transition-opacity hover:text-forge-err group-hover:opacity-100" title="Eliminar conversación (servidor + guardada)">
                Eliminar
              </button>
            </div>
          </div>
        ))}
        {saved.length > 0 && (
          <>
            <p className="section-label px-1 pb-1 pt-2">Guardados en este equipo</p>
            {saved.map((a) => (
              <div
                key={a.id}
                className={`anim-fade group mb-1.5 rounded-lg border border-dashed p-2 transition-colors ${
                  a.id === activeId ? 'border-forge-accent-dim bg-forge-accent-soft' : 'border-forge-border-soft hover:border-forge-border'
                }`}
              >
                <button onClick={() => onViewArchived(a.id)} className="block w-full truncate text-left text-[12px] font-semibold" title={a.id}>
                  {a.title}
                </button>
                <div className="mono mt-0.5 truncate text-[10px] text-forge-faint">
                  {fmtWhen(null, a.updatedAt)}{a.modelLabel ? ` · ${a.modelLabel}` : ''}
                </div>
                <div className="mt-1 flex gap-2">
                  {a.id === activeId ? (
                    <button onClick={onContinue} disabled={busy} className="text-[11px] text-forge-accent hover:underline disabled:opacity-50">
                      Continuar hablando →
                    </button>
                  ) : (
                    <button onClick={() => onViewArchived(a.id)} className="text-[11px] text-forge-faint hover:text-forge-text">
                      Ver
                    </button>
                  )}
                  <button onClick={() => onDeleteArchived(a.id)} className="ml-auto text-[11px] text-forge-faint opacity-0 transition-opacity hover:text-forge-err group-hover:opacity-100" title="Eliminar conversación guardada">
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
