import { describe, expect, it } from 'vitest';
import { getVariants, variantHint } from './model-variants';

describe('getVariants', () => {
  it('extrae ids únicos y tolera formas raras', () => {
    expect(getVariants(null)).toEqual([]);
    expect(getVariants(undefined)).toEqual([]);
    expect(getVariants({ id: 'a', modelID: 'a', providerID: 'p' })).toEqual([]);
    expect(
      getVariants({
        id: 'a', modelID: 'a', providerID: 'p',
        variants: [{ id: 'low' }, { id: 'high' }, { id: 'low' }, { id: '' }, null, {}],
      } as never),
    ).toEqual(['low', 'high']);
  });
  it('hint honesto sin inventar significados', () => {
    expect(variantHint(0)).toContain('no expone variantes');
    expect(variantHint(3)).toContain('la define el proveedor');
  });
});
