// Línea de estado: conexión, nº de mensajes y consumo real de la sesión.
import { useApp } from '../../stores/app';
import { useSessions } from '../../stores/sessions';
import { EMPTY_MSGS, formatCost, formatTokens, sessionTotals } from '../../lib/session-stats';

export function StatusLine() {
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
