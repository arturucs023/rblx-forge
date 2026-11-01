import { describe, expect, it } from 'vitest';
import { sessionTotals, formatTokens, formatCost } from './session-stats';

describe('sessionTotals', () => {
  it('suma tokens y coste de mensajes assistant', () => {
    const t = sessionTotals([
      { id: 'a', type: 'user', text: 'hola' },
      { id: 'b', type: 'assistant', tokens: { input: 4790, output: 25 }, cost: 0 },
      { id: 'c', type: 'assistant', tokens: { input: 3021, output: 3 }, cost: 0.002 },
    ]);
    expect(t).toMatchObject({ input: 7811, output: 28, messages: 3 });
    expect(t.cost).toBeCloseTo(0.002, 6);
  });
  it('ignora mensajes sin números', () => {
    expect(sessionTotals([{ id: 'x' }])).toMatchObject({ input: 0, output: 0, cost: 0, messages: 1 });
  });
});

describe('formatos', () => {
  it('tokens y coste', () => {
    expect(formatTokens(4790)).toBe('4.8k');
    expect(formatTokens(999)).toBe('999');
    expect(formatCost(0)).toBe('gratis');
    expect(formatCost(0.002)).toBe('$0.0020');
  });
});
