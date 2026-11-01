import { describe, expect, it } from 'vitest';
import { defaultValues, isSingleChoice, validateAnswer } from './forms';

describe('forms', () => {
  it('single vs multi según maxItems', () => {
    expect(isSingleChoice({ key: 'a', type: 'multiselect', maxItems: 1 })).toBe(true);
    expect(isSingleChoice({ key: 'a', type: 'multiselect', maxItems: 2 })).toBe(false);
    expect(isSingleChoice({ key: 'a', type: 'string' })).toBe(false);
  });
  it('valida obligatorios y límites sin inventar', () => {
    const fields = [
      { key: 'modo', title: 'Modo', type: 'multiselect', required: true, minItems: 1, maxItems: 1 },
      { key: 'nombre', title: 'Nombre', type: 'string', required: true },
    ];
    expect(validateAnswer(fields, {})).toHaveLength(2);
    expect(validateAnswer(fields, { modo: ['x', 'y'], nombre: 'n' })[0]).toContain('como mucho 1');
    expect(validateAnswer(fields, { modo: ['x'], nombre: 'n' })).toEqual([]);
    // Ocultos no se exigen.
    expect(validateAnswer([{ key: 'h', type: 'string', required: true, hidden: true }], {})).toEqual([]);
  });
  it('valores por defecto tolerantes', () => {
    expect(defaultValues([{ key: 'b', type: 'boolean', default: true }])).toEqual({ b: true });
    expect(defaultValues([{ key: 'm', type: 'multiselect' }])).toEqual({ m: [] });
  });
});
