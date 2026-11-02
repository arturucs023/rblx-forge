// Apartado "Uso del plan" en Configuración (datos reales, nada inventado).
// Fuente: `GET /api/experimental/usage/limits` (OpenAPI 2.2.4): allowance de
// OpenCode Go (rolling/semanal/mensual) + budgets de Console del workspace.
// `null` = workspace no firmado en OpenCode Console: se dice, no se inventa.
import { useCallback, useEffect, useState } from 'react';
import { useSessions } from '../stores/sessions';
import { getWorkspaceDir } from '../lib/paths';
import type { UsageLimitsInfo, UsageMeter } from '../lib/opencode';
import { METER_LABEL, clampPercent, formatMoney, formatResetsAt, meterState, type MeterKind } from '../lib/usage';

function MeterBar({ kind, meter }: { kind: MeterKind; meter: UsageMeter }) {
  const pct = clampPercent(meter.percent);
  const st = meterState(meter);
  const color = st === 'limited' ? 'bg-forge-err' : st === 'high' ? 'bg-forge-warn' : 'bg-forge-ok';
  return (
    <div className="rounded-lg border border-forge-border-soft bg-forge-panel p-2">
      <div className="flex items-center gap-2">
        <p className="text-[12px] font-bold">{METER_LABEL[kind]}</p>
        {st === 'limited' && <span className="pill pill-err !text-[10px]">limitado</span>}
        <span className="mono ml-auto text-[12px] font-bold">{pct.toFixed(0)}%</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-forge-panel3" title={`${pct.toFixed(1)}% usado`}>
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="mono mt-1 text-[10px] text-forge-faint">Se reinicia: {formatResetsAt(meter.resetsAt)}</p>
    </div>
  );
}

export function GoUsage() {
  const client = useSessions((s) => s.client);
  const [info, setInfo] = useState<UsageLimitsInfo | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (quiet = false) => {
    const c = useSessions.getState().client;
    if (!c) {
      setInfo(undefined);
      return;
    }
    if (!quiet) setBusy(true);
    if (!quiet) setError(null);
    try {
      const ws = await getWorkspaceDir().catch(() => '');
      const data = await c.getUsageLimits(ws || undefined);
      setInfo(data ?? null);
    } catch (e) {
      // En refresco silencioso no se pisa lo ya mostrado.
      if (!quiet) setError(String(e).slice(0, 300));
    } finally {
      if (!quiet) setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, client]);

  // Auto-actualización cada 5 s (silenciosa: no parpadea ni pisa datos si falla).
  useEffect(() => {
    if (!client) return;
    const t = setInterval(() => void load(true), 5000);
    return () => clearInterval(t);
  }, [load, client]);

  return (
    <div className="max-w-3xl p-3">
      <div className="mb-1 flex items-center gap-2">
        <p className="text-[12px] font-bold">Uso del plan (OpenCode Go)</p>
        <button onClick={() => load(false)} disabled={busy || !client} className="btn btn-ghost ml-auto !py-0.5 !text-[11px] disabled:opacity-40">
          {busy ? 'Actualizando…' : 'Actualizar'}
        </button>
      </div>
      <p className="mb-2 text-[11px] text-forge-muted">
        Allowance de Go (rolling / semanal / mensual) y budgets de Console del workspace firmado.
        Se actualiza solo cada 5 s. Sin firmar o sin conexión no hay datos: la app lo indica en vez de inventarlos.
      </p>
      {!client && <p className="text-[12px] text-forge-muted">Sin conexión a OpenCode: conecta el servidor gestionado para consultar el uso.</p>}
      {client && error && <p className="text-[12px] text-forge-err">No se pudo leer el uso: {error}</p>}
      {client && !error && info === undefined && <p className="mono text-[11px] text-forge-faint">Consultando…</p>}
      {client && !error && info === null && (
        <p className="text-[12px] text-forge-muted">
          El workspace no está firmado en OpenCode Console (el servidor devolvió <span className="mono">null</span>).
          Firma el workspace en OpenCode para ver rolling/semanal/mensual aquí.
        </p>
      )}
      {client && !error && info && (
        <div>
          <p className="mono mb-2 text-[11px] text-forge-muted" title={info.workspace.id}>
            Workspace: {info.workspace.name || info.workspace.id}
          </p>
          {info.go ? (
            <div className="grid gap-2 sm:grid-cols-3">
              {(['rolling', 'weekly', 'monthly'] as MeterKind[]).map((k) => (
                <MeterBar key={k} kind={k} meter={info.go![k]} />
              ))}
            </div>
          ) : (
            <p className="text-[12px] text-forge-muted">Sin allowance de Go en este workspace.</p>
          )}
          <p className="mb-1 mt-3 text-[12px] font-bold">Budgets de Console ({info.budgets.length})</p>
          {info.budgets.length === 0 && <p className="text-[12px] text-forge-muted">Sin budgets configurados.</p>}
          {info.budgets.map((b) => (
            <div key={b.id} className="mono mb-1 rounded-lg border border-forge-border-soft bg-forge-panel px-2 py-1 text-[11px] text-forge-muted">
              <span className="font-bold text-forge-text">{formatMoney(b.spent)} / {formatMoney(b.limit)}</span>
              <span> · {b.scope}/{b.per}/{b.coverage}</span>
              {b.shared && <span> · compartido</span>}
              {b.picked && <span> · activo</span>}
              <span> · reinicia {formatResetsAt(b.resetsAt)}</span>
              {b.models.length > 0 && <span> · {b.models.length} modelos</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
