// Helpers puros del selector de modelos (agrupar, buscar, coste).
// Solo reflejan lo que OpenCode publica: sin precios ni capacidades inventadas.
import type { ModelInfo } from '../opencode';

export interface ProviderGroup {
  provider: string;
  items: ModelInfo[];
}

export function groupModelsByProvider(models: ModelInfo[]): ProviderGroup[] {
  const map = new Map<string, ModelInfo[]>();
  for (const m of models) {
    const arr = map.get(m.providerID) ?? [];
    arr.push(m);
    map.set(m.providerID, arr);
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([provider, items]) => ({
      provider,
      items: [...items].sort((x, y) => (x.name || x.modelID || x.id).localeCompare(y.name || y.modelID || y.id)),
    }));
}

export function filterModels(models: ModelInfo[], q: string): ModelInfo[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return models;
  return models.filter((m) =>
    [m.id, m.modelID, m.name ?? '', m.providerID].some((s) => s.toLowerCase().includes(needle)),
  );
}

/** Etiqueta de coste con datos reales del servidor: gratis / $in/$out / n/d. */
export function costLabel(m: ModelInfo): string {
  const c = m.cost?.[0];
  if (!c) return 'coste n/d';
  const inp = typeof c.input === 'number' ? c.input : null;
  const out = typeof c.output === 'number' ? c.output : null;
  if (inp === 0 && out === 0) return 'gratis';
  const f = (v: number | null) => (v === null ? '?' : `$${v}`);
  return `${f(inp)}/${f(out)} por 1M tokens`;
}

export function isFreeModel(m: ModelInfo): boolean {
  const c = m.cost?.[0];
  return !!c && c.input === 0 && c.output === 0;
}

export function variantCount(m: ModelInfo): number {
  return Array.isArray(m.variants) ? m.variants.filter((v) => v && typeof v.id === 'string').length : 0;
}
