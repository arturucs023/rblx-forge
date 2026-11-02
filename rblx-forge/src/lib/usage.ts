// Helpers puros del apartado "Uso del plan" (sin Tauri ni red).
// Todo sale de `GET /api/experimental/usage/limits` (OpenAPI 2.2.4):
// meters rolling/weekly/monthly {percent, limited, resetsAt} + budgets.
// Nada inventado: sin datos del servidor no hay porcentajes ni límites.
import type { UsageLimitsInfo, UsageMeter } from './opencode';

export type MeterKind = 'rolling' | 'weekly' | 'monthly';

export const METER_LABEL: Record<MeterKind, string> = {
  rolling: 'Rolling (ventana corta)',
  weekly: 'Semanal',
  monthly: 'Mensual',
};

export function meterOf(info: UsageLimitsInfo | null, kind: MeterKind): UsageMeter | null {
  if (!info?.go) return null;
  const m = info.go[kind];
  if (!m || typeof m.percent !== 'number' || typeof m.resetsAt !== 'number') return null;
  return m;
}

/** 0–100 recortado (el servidor ya lo acota, pero no se confía en ello). */
export function clampPercent(p: number): number {
  if (!Number.isFinite(p)) return 0;
  return Math.min(100, Math.max(0, p));
}

/** Fecha del próximo reseteo en hora local, o '—' si no hay dato. */
export function formatResetsAt(ms: number | null | undefined): string {
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms <= 0) return '—';
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return '—';
  }
}

/** Estado honesto del meter: limitado / alto / normal / sin datos. */
export function meterState(m: UsageMeter | null): 'limited' | 'high' | 'normal' | 'unknown' {
  if (!m) return 'unknown';
  if (m.limited) return 'limited';
  if (clampPercent(m.percent) >= 80) return 'high';
  return 'normal';
}

export function formatMoney(n: number | null | undefined): string {
  if (typeof n !== 'number' || !Number.isFinite(n)) return 'n/d';
  return `$${n.toFixed(2)}`;
}
