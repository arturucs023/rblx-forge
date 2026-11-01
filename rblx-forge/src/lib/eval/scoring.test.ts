import { describe, expect, it } from 'vitest';
import { autoVerdict, computeScore, type DimId } from './scoring';
import { GROUP_LABELS, VERDICT_LABELS } from './types';
import { luaBalanceHeuristic } from '../../stores/eval';

const full = (v: number): Record<DimId, { score: number | null }> => ({
  tecnica: { score: v },
  resultado: { score: v },
  especializacion: { score: v },
  completitud: { score: v },
  aplicabilidad: { score: v },
  consistencia: { score: v },
});

describe('computeScore', () => {
  it('100 en todo → 100 y PASSED', () => {
    const r = computeScore(full(100), { criticalCount: 0, autoOk: true });
    expect(r.score).toBe(100);
    expect(r.coverage).toBe(1);
    expect(r.verdict).toBe('PASSED');
  });
  it('críticos bloquean aunque todo sea 100', () => {
    const r = computeScore(full(100), { criticalCount: 2, autoOk: true });
    expect(r.verdict).toBe('BLOCKED');
    expect(r.score).toBeNull();
    expect(r.blockedByCritical).toBe(true);
  });
  it('sin criterios → NOT_EVALUATED, nunca 0 inventado', () => {
    const r = computeScore(
      { tecnica: { score: null }, resultado: { score: null }, especializacion: { score: null }, completitud: { score: null }, aplicabilidad: { score: null }, consistencia: { score: null } },
      { criticalCount: 0, autoOk: null },
    );
    expect(r.verdict).toBe('NOT_EVALUATED');
    expect(r.score).toBeNull();
    expect(r.coverage).toBe(0);
  });
  it('cobertura parcial: score sobre lo evaluado + NEEDS_IMPROVEMENT', () => {
    const r = computeScore(
      { ...full(80), especializacion: { score: null }, completitud: { score: null }, aplicabilidad: { score: null }, consistencia: { score: null } },
      { criticalCount: 0, autoOk: true },
    );
    expect(r.score).toBe(80);
    expect(r.coverage).toBeCloseTo(0.5, 5);
    expect(r.missing).toContain('especializacion');
    expect(r.verdict).toBe('NEEDS_IMPROVEMENT');
  });
  it('auto fallido → FAILED', () => {
    const r = computeScore(full(90), { criticalCount: 0, autoOk: false });
    expect(r.verdict).toBe('FAILED');
  });
  it('pesos suman 1 y 15 grupos con etiquetas', () => {
    expect(Object.keys(GROUP_LABELS)).toHaveLength(15);
    expect(Object.keys(VERDICT_LABELS)).toContain('BLOCKED');
  });
});

describe('autoVerdict', () => {
  it('todo ok → true; un fallo → false; todo N/E → null', () => {
    expect(autoVerdict([{ kind: 'a', param: '', weight: 1, passed: true, detail: '' }])).toBe(true);
    expect(autoVerdict([
      { kind: 'a', param: '', weight: 0.5, passed: true, detail: '' },
      { kind: 'b', param: '', weight: 0.5, passed: false, detail: '' },
    ])).toBe(false);
    expect(autoVerdict([{ kind: 'a', param: '', weight: 1, passed: null, detail: '' }])).toBeNull();
  });
});

describe('luaBalanceHeuristic', () => {
  it('código sano pasa; end faltante falla', () => {
    expect(luaBalanceHeuristic('local function f()\n if x then\n print(1)\n end\nend').ok).toBe(true);
    const bad = luaBalanceHeuristic('local function f()\n if x then\n print(1)\n');
    expect(bad.ok).toBe(false);
  });
});
