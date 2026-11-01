import type { SessionMessage } from './opencode';

export const EMPTY_MSGS: SessionMessage[] = [];

export interface SessionTotals {
  input: number;
  output: number;
  cost: number;
  messages: number;
}

/** Suma tokens/coste reales de los mensajes (assistant trae tokens+cost). */
export function sessionTotals(msgs: SessionMessage[] | null | undefined): SessionTotals {
  const list = Array.isArray(msgs) ? msgs : [];
  let input = 0;
  let output = 0;
  let cost = 0;
  for (const m of list) {
    if (!m || typeof m !== 'object') continue;
    const t = (m.tokens ?? {}) as { input?: unknown; output?: unknown };
    const c = (m as { cost?: unknown }).cost;
    if (typeof t.input === 'number') input += t.input;
    if (typeof t.output === 'number') output += t.output;
    if (typeof c === 'number') cost += c;
  }
  return { input, output, cost, messages: list.length };
}

export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function formatCost(usd: number): string {
  if (usd === 0) return 'gratis';
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}
