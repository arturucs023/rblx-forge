// Variantes de modelo OpenCode (p. ej. default/low/medium/high/max).
// Cada modelo define las suyas (o ninguna): aquí no se inventa ninguna
// variante ni su significado; todo sale de `Model.Info.variants` del servidor.
import type { ModelInfo } from './opencode';

export function getVariants(m: ModelInfo | null | undefined): string[] {
  if (!m || !Array.isArray(m.variants)) return [];
  const out: string[] = [];
  for (const v of m.variants) {
    if (v && typeof v.id === 'string' && v.id.trim() && !out.includes(v.id)) {
      out.push(v.id);
    }
  }
  return out;
}

/** Etiqueta honesta: las variantes las define cada proveedor. */
export function variantHint(count: number): string {
  if (count === 0) return 'Este modelo no expone variantes: usa su configuración por defecto.';
  return 'Variante del modelo (la define el proveedor). Vacío = por defecto del servidor.';
}
