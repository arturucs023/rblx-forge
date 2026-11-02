// Tests puros del apartado de uso (sin red ni Tauri).
import { describe, expect, it } from 'vitest';
import { clampPercent, formatMoney, formatResetsAt, meterOf, meterState, type MeterKind } from './usage';
import type { UsageLimitsInfo } from './opencode';

const info = (percent: number, limited: boolean): UsageLimitsInfo => ({
  workspace: { id: 'ws1', usageURL: 'https://x' },
  go: {
    rolling: { percent, limited, resetsAt: 1700000000000 },
    weekly: { percent: 10, limited: false, resetsAt: 1700000000000 },
    monthly: { percent: 5, limited: false, resetsAt: 1700000000000 },
  },
  budgets: [],
});

describe('meterOf', () => {
  it('devuelve el meter pedido y null sin go', () => {
    expect(meterOf(info(42, false), 'rolling')?.percent).toBe(42);
    expect(meterOf({ workspace: { id: 'w', usageURL: 'u' }, budgets: [] }, 'weekly')).toBeNull();
    expect(meterOf(null, 'monthly' as MeterKind)).toBeNull();
  });
});

describe('clampPercent', () => {
  it('recorta a 0–100', () => {
    expect(clampPercent(150)).toBe(100);
    expect(clampPercent(-3)).toBe(0);
    expect(clampPercent(Number.NaN)).toBe(0);
    expect(clampPercent(37.5)).toBe(37.5);
  });
});

describe('meterState', () => {
  it('limited manda sobre el porcentaje', () => {
    expect(meterState(info(10, true).go!.rolling)).toBe('limited');
    expect(meterState(info(90, false).go!.rolling)).toBe('high');
    expect(meterState(info(20, false).go!.rolling)).toBe('normal');
    expect(meterState(null)).toBe('unknown');
  });
});

describe('formatResetsAt', () => {
  it('fecha válida localiza, dato malo da guion', () => {
    expect(formatResetsAt(1700000000000)).toContain('2023');
    expect(formatResetsAt(null)).toBe('—');
    expect(formatResetsAt(-1)).toBe('—');
  });
});

describe('formatMoney', () => {
  it('dos decimales o n/d', () => {
    expect(formatMoney(4)).toBe('$4.00');
    expect(formatMoney(null)).toBe('n/d');
  });
});
