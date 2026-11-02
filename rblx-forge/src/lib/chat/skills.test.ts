// Tests puros del catálogo exclusivo de skills propias (sin Tauri ni red).
import { describe, expect, it } from 'vitest';
import {
  buildCatalogText, buildFirstMessage, buildFollowupMessage, buildSkillsPreamble,
  matchSkillIds, normalizeSkillId, validateSkillIds,
  SKILLS_CATALOG_CHAR_CAP, SKILLS_MAX_EXCERPTS,
  type OwnSkill,
} from './skills';

const catalog: OwnSkill[] = [
  { id: 'roblox-main-menu', name: 'Menú Principal Roblox', description: 'Menús con jugar y modos', path: '.opencode/skills/roblox-main-menu/SKILL.md' },
  { id: 'luau-core', name: 'luau-core', description: 'Sintaxis y tablas Luau', path: '.agents/skills/luau-core/SKILL.md' },
  { id: 'roblox-obby', name: 'Obby', description: 'Checkpoints y dificultad', path: '.opencode/skills/roblox-obby/SKILL.md' },
];

describe('normalizeSkillId', () => {
  it('minúsculas y recorte', () => {
    expect(normalizeSkillId('  Roblox-Main-Menu ')).toBe('roblox-main-menu');
  });
});

describe('buildCatalogText', () => {
  it('ordena por id y respeta el tope', () => {
    const text = buildCatalogText(catalog);
    expect(text.indexOf('luau-core')).toBeLessThan(text.indexOf('roblox-main-menu'));
    expect(text).toContain('roblox-obby: Checkpoints');
    expect(text.length).toBeLessThanOrEqual(SKILLS_CATALOG_CHAR_CAP);
  });
  it('catálogo vacío no rompe', () => {
    expect(buildCatalogText([])).toBe('');
  });
});

describe('buildSkillsPreamble', () => {
  it('prohíbe skills ajenas y cita el total', () => {
    const p = buildSkillsPreamble(148);
    expect(p).toContain('148');
    expect(p).toContain('EXCLUSIVAMENTE');
    expect(p).toContain('PROHIBIDO');
  });
});

describe('matchSkillIds', () => {
  it('casa por id exacto insensible a mayúsculas', () => {
    expect(matchSkillIds('usa ROBLOX-MAIN-MENU para el menú', catalog)).toEqual(['roblox-main-menu']);
  });
  it('casa por nombre', () => {
    expect(matchSkillIds('pon un Obby con checkpoints', catalog)).toEqual(['roblox-obby']);
  });
  it('no inventa con texto genérico', () => {
    expect(matchSkillIds('hazme un juego guay', catalog)).toEqual([]);
  });
  it('respeta el tope', () => {
    const many: OwnSkill[] = Array.from({ length: 10 }, (_, i) => ({
      id: `skill-${i}`, name: `skill-${i}`, description: 'd', path: `p/skill-${i}/SKILL.md`,
    }));
    const text = many.map((s) => s.id).join(' ');
    expect(matchSkillIds(text, many).length).toBeLessThanOrEqual(SKILLS_MAX_EXCERPTS);
  });
});

describe('validateSkillIds', () => {
  it('solo deja pasar ids del registro propio', () => {
    expect(validateSkillIds(['roblox-main-menu', 'skill-ajena', 'LUau-CORE', 'roblox-main-menu'], catalog))
      .toEqual(['roblox-main-menu', 'luau-core']);
  });
});

describe('buildFirstMessage', () => {
  it('incluye preámbulo, catálogo y petición', () => {
    const first = buildFirstMessage('haz el menú', buildCatalogText(catalog), catalog.length, '');
    expect(first).toContain('EXCLUSIVAMENTE');
    expect(first).toContain('roblox-main-menu');
    expect(first).toContain('haz el menú');
  });
});

describe('buildFollowupMessage', () => {
  it('sin extractos devuelve el texto tal cual', () => {
    expect(buildFollowupMessage('sigue', '', [])).toBe('sigue');
  });
  it('con extractos adjunta bloque', () => {
    const out = buildFollowupMessage('sigue', '--- SKILL x ---', ['roblox-obby']);
    expect(out).toContain('roblox-obby');
    expect(out).toContain('--- SKILL x ---');
  });
});
