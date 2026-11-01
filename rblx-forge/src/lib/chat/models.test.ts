import { describe, expect, it } from 'vitest';
import { costLabel, filterModels, groupModelsByProvider, isFreeModel, variantCount } from './models';
import type { ModelInfo } from '../opencode';

const mk = (over: Partial<ModelInfo> & { id: string }): ModelInfo =>
  ({ modelID: over.id, providerID: 'p', ...over } as ModelInfo);

describe('selector de modelos (solo datos del servidor)', () => {
  const models = [
    mk({ id: 'b', providerID: 'z', name: 'Zeta', cost: [{ input: 3, output: 15 }] }),
    mk({ id: 'a', providerID: 'z', cost: [{ input: 0, output: 0 }] }),
    mk({ id: 'c', providerID: 'a', name: 'Mimo Flash', variants: [{ id: 'low' }, { id: 'high' }, {} as never] }),
  ];
  it('agrupa por proveedor ordenado e items ordenados', () => {
    const g = groupModelsByProvider(models);
    expect(g.map((x) => x.provider)).toEqual(['a', 'z']);
    expect(g[1].items.map((x) => x.id)).toEqual(['a', 'b']);
  });
  it('filtra por id, nombre o proveedor', () => {
    expect(filterModels(models, 'mimo')).toHaveLength(1);
    expect(filterModels(models, 'Z')).toHaveLength(2);
    expect(filterModels(models, '  ')).toHaveLength(3);
  });
  it('coste honesto sin inventar', () => {
    expect(costLabel(models[0])).toContain('$3');
    expect(costLabel(models[1])).toBe('gratis');
    expect(costLabel(models[2])).toBe('coste n/d');
    expect(isFreeModel(models[1])).toBe(true);
    expect(isFreeModel(models[0])).toBe(false);
  });
  it('cuenta variantes válidas', () => {
    expect(variantCount(models[2])).toBe(2);
    expect(variantCount(models[0])).toBe(0);
  });
});
