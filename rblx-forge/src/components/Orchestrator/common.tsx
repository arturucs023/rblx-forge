import type { ReactNode } from 'react';
import { RUN_LABELS, STATE_LABELS, BUILTIN_PROFILE_META } from '../../lib/orch/types';

const STATE_TONE: Record<string, string> = {
  PENDING: 'text-forge-muted',
  READY: 'text-forge-info',
  RUNNING: 'text-forge-accent',
  WAITING_APPROVAL: 'text-forge-warn',
  BLOCKED: 'text-forge-err',
  COMPLETED: 'text-forge-ok',
  FAILED: 'text-forge-err',
  CANCELLED: 'text-forge-faint',
  borrador: 'text-forge-muted',
  pendiente_aprobacion: 'text-forge-warn',
  en_ejecucion: 'text-forge-accent',
  pausado: 'text-forge-warn',
  completada: 'text-forge-ok',
  fallida: 'text-forge-err',
  cancelada: 'text-forge-faint',
};

export function StateBadge({ state }: { state: string }) {
  const label = STATE_LABELS[state] ?? RUN_LABELS[state] ?? state;
  return <span className={`font-semibold ${STATE_TONE[state] ?? 'text-forge-muted'}`}>{label}</span>;
}

export function AgentGlyph({ id, size }: { id: string; size?: number }) {
  const m = BUILTIN_PROFILE_META[id];
  if (!m) return <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-forge-panel3 text-[11px] text-forge-muted">◈</span>;
  return (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px]" style={{ background: 'var(--color-forge-panel3)', color: m.color, fontSize: size ?? 11 }}>
      {m.glyph}
    </span>
  );
}

export function Empty({ title, hint, action }: { title: string; hint: string; action?: ReactNode }) {
  return (
    <div className="mx-auto max-w-md p-6 text-center">
      <div className="card anim-enter p-5">
        <p className="font-bold">{title}</p>
        <p className="mt-1 text-[12px] text-forge-muted">{hint}</p>
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}

export function fmtTs(secs: number): string {
  try {
    return new Date(secs * 1000).toLocaleString();
  } catch {
    return '—';
  }
}

export function fmtDur(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return '—';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}
