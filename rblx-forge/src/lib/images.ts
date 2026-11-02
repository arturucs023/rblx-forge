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

/** Etiqueta estilo OpenCode para la N-ésima imagen del mensaje. */
export function pastedImageName(n: number): string {
  return `[Image ${Math.max(1, Math.floor(n))}]`;
}

/** Catálogo de modelos de imagen (contratos y precios verificados en docs).
 * Cloudflare: Neurons (pricing 2026-10-20). Google: $/imagen sin capa gratis. */
export type ImageProvider = 'cloudflare' | 'google';

export interface ImageModelOption {
  provider: ImageProvider;
  model: string;
  label: string;
  /** Coste aproximado por imagen generada (texto listo para UI). */
  costHint: string;
  supportsSteps: boolean;
  supportsSeed: boolean;
}

export const IMAGE_MODELS: ImageModelOption[] = [
  {
    provider: 'cloudflare',
    model: '@cf/black-forest-labs/flux-1-schnell',
    label: 'FLUX.1 schnell',
    costHint: '≈58 Neurons/imagen a 4 pasos',
    supportsSteps: true,
    supportsSeed: true,
  },
  {
    provider: 'google',
    model: 'gemini-nano-banana-2.1',
    label: 'Nano Banana 2.1',
    costHint: '≈$0,0336/imagen (de pago)',
    supportsSteps: false,
    supportsSeed: false,
  },
  {
    provider: 'google',
    model: 'gemini-2.5-flash-image',
    label: 'Nano Banana (2.5)',
    costHint: '≈$0,039/imagen (de pago)',
    supportsSteps: false,
    supportsSeed: false,
  },
];

export const PROVIDER_LABEL: Record<ImageProvider, string> = {
  cloudflare: 'Cloudflare Workers AI',
  google: 'Google Gemini',
};

/** Estimación schnell con los pasos elegidos (fórmula oficial: 4 tiles 512²
 * × 4,80 + pasos × 9,60; salida 1024² supuesta). Medición real de un usuario:
 * 173 Neurons a 4 pasos (la contabilidad interna difiere de la fórmula
 * ingenua), por eso existe la calibración de abajo. */
export function schnellEstimate(steps: number): number {
  const s = Math.min(8, Math.max(1, Math.floor(steps)));
  return 4 * 4.8 + s * 9.6;
}

/** Estimación calibrada: parte de una medición real a 4 pasos (la del panel
 * de Cloudflare) y ajusta la parte variable con la tarifa oficial 9,60/step.
 * Sin medición, cae a la fórmula oficial. */
export function calibratedSchnellEstimate(steps: number | null | undefined, measuredAt4: number | null | undefined): number {
  const s = typeof steps === 'number' && Number.isFinite(steps)
    ? Math.min(8, Math.max(1, Math.floor(steps)))
    : FLUX_DEFAULT_STEPS;
  if (typeof measuredAt4 === 'number' && Number.isFinite(measuredAt4) && measuredAt4 > 0) {
    return Math.max(0, measuredAt4 + (s - FLUX_DEFAULT_STEPS) * 9.6);
  }
  return schnellEstimate(s);
}

/** ¿Es un chip de imagen pegada/adjunta (se muestra sin 📎)? */
export function isImageChipName(name: string): boolean {
  return /^\[Image \d+\]/i.test(name.trim());
}

export function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return 'n/d';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}
