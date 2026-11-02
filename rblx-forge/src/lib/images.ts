// Helpers puros del modo Imágenes (sin Tauri ni red).
// Modelo: FLUX.1 schnell vía Cloudflare Workers AI.
// Contrato: prompt 1..=2048 chars, steps 1..=8 (defecto 4), seed opcional.
// Respuesta: {result:{image: base64}, success, errors[]}.
export const FLUX_MODEL = '@cf/black-forest-labs/flux-1-schnell';
export const FLUX_DEFAULT_STEPS = 4;
export const FLUX_MAX_STEPS = 8;
export const FLUX_MAX_PROMPT_CHARS = 2048;

export function clampSteps(steps: number | null | undefined): number {
  if (typeof steps !== 'number' || !Number.isFinite(steps)) return FLUX_DEFAULT_STEPS;
  return Math.min(FLUX_MAX_STEPS, Math.max(1, Math.floor(steps)));
}

export function validatePrompt(prompt: string): string | null {
  const p = prompt.trim();
  if (!p) return 'Describe la imagen que quieres generar.';
  if ([...p].length > FLUX_MAX_PROMPT_CHARS) {
    return `El prompt supera los ${FLUX_MAX_PROMPT_CHARS} caracteres del modelo.`;
  }
  return null;
}

/** Normaliza la seed del input: vacío = aleatoria (el servidor elige). */
export function normalizeSeed(raw: string): number | undefined {
  const t = raw.trim();
  if (!t) return undefined;
  const n = Math.floor(Number(t));
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n;
}

/** Mensaje honesto a partir del error del backend. */
export function imageErrorMessage(err: unknown): string {
  const s = String(err);
  if (/Account ID/i.test(s) && /falta/i.test(s)) return s;
  if (/API token/i.test(s) && /falta/i.test(s)) return s;
  if (/401|auth/i.test(s)) return 'Cloudflare rechazó la petición: revisa el API token (Configuración → Imágenes).';
  if (/404/i.test(s)) return 'Cuenta o ruta no encontrada: revisa el Account ID.';
  if (/8192|límite|limit|quota|neuron/i.test(s)) return 'Límite de Cloudflare alcanzado (cuota de Neurons): espera al reinicio diario.';
  // Fallos de red/transporte o HTTP con detalle: mostrar el detalle real
  // (clasificado en el backend), no un genérico que oculte la causa.
  return s.slice(0, 400);
}

/** Clasificación orientativa del campo token (solo ayuda, nunca bloquea).
 * El API token es una cadena larga (≈40 chars); el Account ID son 32 hex. */
export function classifyToken(raw: string): 'empty' | 'maybe-account-id' | 'short' | 'maybe-token' {
  const v = raw.trim();
  if (!v) return 'empty';
  if (/^[0-9a-f]{32}$/i.test(v)) return 'maybe-account-id';
  if (v.length < 30) return 'short';
  return 'maybe-token';
}

/** Consejo accionable cuando la verificación dice token inválido (código 1000). */
export function tokenVerifyAdvice(detail: string): string | null {
  if (/1000|Invalid API Token/i.test(detail)) {
    return 'Ese valor no coincide con ningún token vivo: recópialo entero del diálogo de creación (se muestra una sola vez) o crea uno nuevo; si lo pegaste en un chat o captura, elimínalo en el panel y genera otro.';
  }
  return null;
}

export function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return 'n/d';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}
