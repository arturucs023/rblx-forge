import { describe, expect, it } from 'vitest';
import { parseSelene, parseStyluaCheck } from './diagnostics';

// Fixtures: salida REAL capturada de selene 0.32.0 y stylua 2.6.0 sobre
// (rutas neutralizadas; lo que se valida es el formato, no la mÃ¡quina).

const SELENE_OUT = `warning[unused_variable]: y_unused is assigned a value, but never used
  ┌─ fixture.lua:2:7
  │
2 │ local y_unused = 2
  │       ^^^^^^^^

Results:
0 errors
1 warnings
0 parse errors
`;

const STYLUA_OUT = `Diff in fixture.lua:
1        |-local x=1
    1    |+local x = 1
`;

describe('parseSelene', () => {
  it('extrae severidad, código, mensaje y posición', () => {
    const d = parseSelene(SELENE_OUT);
    expect(d).toHaveLength(1);
    expect(d[0]).toMatchObject({ severity: 'warning', code: 'unused_variable', line: 2, col: 7 });
    expect(d[0].message).toContain('never used');
  });
  it('vacío sin hallazgos', () => {
    expect(parseSelene('Results:\n0 errors\n0 warnings\n')).toEqual([]);
  });
});

describe('parseStyluaCheck', () => {
  it('agrupa diffs por archivo', () => {
    const f = parseStyluaCheck(STYLUA_OUT);
    expect(f).toHaveLength(1);
    expect(f[0].file).toContain('fixture.lua');
    expect(f[0].diff).toContain('+local x = 1');
  });
});
