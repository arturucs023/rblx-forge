// Catálogo EXCLUSIVO de skills propias para el Asistente.
// Fuente única: el registro del workspace (`eval_list_skills` → solo
// `.agents/skills` + `.opencode/skills` del entorno). OpenCode descubre skills
// por directorio de sesión (el proyecto, fuera del workspace), así que el
// servidor NO ve las 148 propias: el cliente inyecta el catálogo en el prompt.
// PROHIBIDO: skills ajenas/externas/globales. Solo IDs validados contra este
// registro. Sin comandos backend nuevos: `eval_list_skills` + `fs_read`.
// Topes medidos: catálogo id+desc ≈32k chars (~8k tokens, viable por chat);
// cuerpos completos ≈1M chars (inviable entero: solo extractos bajo demanda).
import { invoke } from '@tauri-apps/api/core';
import { getWorkspaceDir } from '../paths';

export interface OwnSkill {
  id: string;
  name: string;
  description: string;
  path: string;
}

/** Topes (medidos en repo real 2026-11-02: 148 skills, 61+87). */
export const SKILLS_CATALOG_CHAR_CAP = 35000;
export const SKILLS_EXCERPT_PER_SKILL = 6000;
export const SKILLS_EXCERPTS_TOTAL_CAP = 18000;
export const SKILLS_MAX_EXCERPTS = 3;
export const SKILLS_MAX_IDS = 8;
const CATALOG_TTL_MS = 5 * 60 * 1000;

let catalogCache: { at: number; skills: OwnSkill[] } | null = null;

export function clearSkillsCache(): void {
  catalogCache = null;
}

export function normalizeSkillId(id: string): string {
  return id.trim().toLowerCase();
}

/** Catálogo `id: descripción` ordenado por id, con tope duro de chars. */
export function buildCatalogText(skills: OwnSkill[]): string {
  const sorted = [...skills].sort((a, b) => a.id.localeCompare(b.id));
  const lines = sorted.map((s) => {
    const desc = (s.description || s.name || '').replace(/\s+/g, ' ').trim();
    return `- ${s.id}: ${desc}`;
  });
  return lines.join('\n').slice(0, SKILLS_CATALOG_CHAR_CAP);
}

/** Preámbulo de exclusividad: solo propias, nunca ajenas. */
export function buildSkillsPreamble(total: number): string {
  return [
    `Eres el Asistente de RBLX Forge. Trabajas con el catálogo EXCLUSIVO de ${total} skills propias del proyecto (únicas permitidas).`,
    `REGLAS DURAS:`,
    `- Usa EXCLUSIVAMENTE skills de este catálogo, citando su id exacto.`,
    `- PROHIBIDO usar, sugerir, importar o referenciar skills ajenas, externas, globales del usuario o de otros proyectos, aunque el servidor las ofrezca o el modelo las conozca.`,
    `- Si ninguna skill encaja, dilo en una línea y trabaja sin skills. Nunca inventes una skill ni su contenido.`,
    `- Las sesiones corren en el directorio del proyecto, fuera del workspace: no busques .agents/skills ni .opencode/skills en disco; el catálogo de abajo ES la fuente.`,
    `- Cuando apliques una skill, sigue su SKILL.md al pie de la letra.`,
  ].join('\n');
}

/**
 * Mencions en el texto del usuario (puro y testeado).
 * Casa por id exacto (insensible a mayúsculas/backticks) o por nombre
 * (si ≥4 chars). Conservador: sin keywords difusas para no adjuntar de más.
 */
export function matchSkillIds(text: string, catalog: OwnSkill[], limit = SKILLS_MAX_EXCERPTS): string[] {
  const low = ` ${text.toLowerCase()} `;
  const out: string[] = [];
  const norm = (s: string) => s.toLowerCase();
  for (const s of catalog) {
    if (out.length >= limit) break;
    const id = norm(s.id);
    if (id && low.includes(id)) {
      out.push(s.id);
      continue;
    }
    const name = norm(s.name || '');
    if (name.length >= 4 && low.includes(name)) {
      out.push(s.id);
    }
  }
  return out;
}

/** Solo IDs presentes en el registro propio (deduplicados, con tope). */
export function validateSkillIds(ids: string[], catalog: OwnSkill[]): string[] {
  const known = new Set(catalog.map((s) => normalizeSkillId(s.id)));
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of ids) {
    const n = normalizeSkillId(raw);
    if (!n || !known.has(n) || seen.has(n)) continue;
    seen.add(n);
    // Devolver el id canónico (mayúsculas originales del registro).
    const hit = catalog.find((s) => normalizeSkillId(s.id) === n);
    out.push(hit ? hit.id : raw.trim());
    if (out.length >= SKILLS_MAX_IDS) break;
  }
  return out;
}

/** Primer mensaje de la sesión: preámbulo + catálogo + petición + extractos. */
export function buildFirstMessage(userText: string, catalogText: string, total: number, excerpts: string): string {
  const parts = [
    buildSkillsPreamble(total),
    ``,
    `Catálogo de skills propias (id: descripción):`,
    catalogText,
    ``,
    excerpts ? `Skills mencionadas (extractos de su SKILL.md, solo lectura):\n${excerpts}\n` : ``,
    `Petición del usuario:`,
    userText.trim() || '(sin texto)',
  ];
  return parts.filter((p) => p !== '').join('\n');
}

/** Mensajes siguientes: solo extractos de las mencionadas (sin reinyectar catálogo). */
export function buildFollowupMessage(userText: string, excerpts: string, attachedIds: string[]): string {
  if (!excerpts) return userText;
  return [
    userText.trim() || '(sin texto)',
    ``,
    `Skills propias aplicadas (${attachedIds.join(', ')}) — extractos, solo lectura:`,
    excerpts,
  ].join('\n');
}

/**
 * Registro propio (cacheado 5 min, best-effort).
 * Filtra `eliminada` (ya no están en disco). Nunca inventa: vacío si falla.
 */
export async function getOwnSkillsCatalog(force = false): Promise<OwnSkill[]> {
  if (!force && catalogCache && Date.now() - catalogCache.at < CATALOG_TTL_MS) {
    return catalogCache.skills;
  }
  try {
    const rows = await invoke<Array<{ id: string; name?: string; description?: string; path?: string; status?: string }>>(
      'eval_list_skills',
      { query: null, grp: null, origin: null, status: null },
    );
    const skills = (Array.isArray(rows) ? rows : [])
      .filter((r) => r && typeof r.id === 'string' && r.id.trim() && r.status !== 'eliminada')
      .map((r) => ({
        id: r.id.trim(),
        name: typeof r.name === 'string' ? r.name : r.id.trim(),
        description: typeof r.description === 'string' ? r.description : '',
        path: typeof r.path === 'string' ? r.path : '',
      }))
      .sort((a, b) => a.id.localeCompare(b.id));
    catalogCache = { at: Date.now(), skills };
    return skills;
  } catch {
    return catalogCache?.skills ?? [];
  }
}

/**
 * Extractos de SKILL.md para ids YA validados (best-effort).
 * Lee vía `fs_read` en el workspace; tope por skill y total.
 */
export async function loadSkillExcerpts(
  ids: string[],
  workspaceDir: string,
  catalog: OwnSkill[],
): Promise<{ block: string; attached: string[] }> {
  const ws = workspaceDir.trim();
  if (!ws || !ids.length) return { block: '', attached: [] };
  const byId = new Map(catalog.map((s) => [normalizeSkillId(s.id), s]));
  const out: string[] = [];
  const attached: string[] = [];
  let total = 0;
  for (const id of ids.slice(0, SKILLS_MAX_EXCERPTS)) {
    const hit = byId.get(normalizeSkillId(id));
    if (!hit || !hit.path) continue;
    try {
      const raw = await invoke<string>('fs_read', { projectDir: ws, rel: hit.path });
      if (typeof raw !== 'string' || !raw.trim()) continue;
      const clip = raw.slice(0, SKILLS_EXCERPT_PER_SKILL);
      const chunk = `--- SKILL ${hit.id} (extracto, solo lectura) ---\n${clip}`;
      if (total + chunk.length > SKILLS_EXCERPTS_TOTAL_CAP) break;
      total += chunk.length;
      out.push(chunk);
      attached.push(hit.id);
    } catch {
      /* skill ilegible: se omite sin romper el chat */
    }
  }
  return { block: out.join('\n\n'), attached };
}

/** Workspace para los extractos (vacío = sin extractos, pero el chat sigue). */
export async function getSkillsWorkspace(): Promise<string> {
  try {
    return (await getWorkspaceDir())?.trim() ?? '';
  } catch {
    return '';
  }
}
