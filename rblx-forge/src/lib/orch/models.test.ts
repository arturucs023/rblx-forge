import { describe, expect, it } from 'vitest';
import { effectiveSource, modelLabel } from './models';

describe('model inheritance labels', () => {
  const t = { providerID: 'p', id: 'a' };
  const a = { providerID: 'p', id: 'b', variant: 'high' };
  const r = { providerID: 'p', id: 'c' };
  it('prioridad tarea > agente > ejecución > sesión', () => {
    expect(effectiveSource(t, a, r)).toBe('tarea');
    expect(effectiveSource(null, a, r)).toBe('agente');
    expect(effectiveSource(null, null, r)).toBe('ejecución');
    expect(effectiveSource(null, null, null)).toBe('sesión');
    expect(effectiveSource({} as never, null, null)).toBe('sesión');
  });
  it('etiqueta honesta', () => {
    expect(modelLabel(null)).toBe('heredado');
    expect(modelLabel(t)).toBe('p/a');
    expect(modelLabel(a)).toBe('p/b · high');
  });
});
