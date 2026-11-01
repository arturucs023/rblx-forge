// Lógica pura de formularios OpenCode (testeada). Sin inventar nada:
// los tipos y opciones vienen del servidor; aquí solo validación y valores.
import type { FormField } from './opencode';

export type FieldValues = Record<string, string | number | boolean | string[]>;

/** multiselect con maxItems=1 ⇒ elección única (radio). Resto ⇒ múltiple. */
export function isSingleChoice(f: FormField): boolean {
  return f.type === 'multiselect' && f.maxItems === 1;
}

export function defaultValues(fields: FormField[]): FieldValues {
  const out: FieldValues = {};
  for (const f of fields) {
    if (typeof f.default === 'boolean' && f.type === 'boolean') out[f.key] = f.default;
    else if (f.type === 'multiselect') out[f.key] = [];
    else if (typeof f.default === 'string' || typeof f.default === 'number') out[f.key] = f.default;
  }
  return out;
}

/** Devuelve la lista de errores (vacía = respuesta válida). */
export function validateAnswer(fields: FormField[], values: FieldValues): string[] {
  const errs: string[] = [];
  for (const f of fields) {
    if (f.hidden) continue;
    const v = values[f.key];
    const empty =
      v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
    if (f.required && empty) {
      errs.push(`«${f.title || f.key}» es obligatorio`);
      continue;
    }
    if (f.type === 'multiselect' && Array.isArray(v)) {
      if (typeof f.minItems === 'number' && v.length < f.minItems) {
        errs.push(`«${f.title || f.key}»: elige al menos ${f.minItems}`);
      }
      if (typeof f.maxItems === 'number' && v.length > f.maxItems) {
        errs.push(`«${f.title || f.key}»: como mucho ${f.maxItems}`);
      }
    }
  }
  return errs;
}
