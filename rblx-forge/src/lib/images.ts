// Helpers puros del modo Imágenes (sin Tauri ni red).
// Cloudflare: prompt 1..=2048 (límite de la app), pasos/seed según modelo.
// Google (Nano Banana): prompt hasta 8000 (límite de la app).
// Respuesta CF: {result:{image: base64}, success, errors[]}.
export const FLUX_MODEL = '@cf/black-forest-labs/flux-1-schnell';
export const FLUX_DEFAULT_STEPS = 4;
export const FLUX_MAX_STEPS = 8;
export const FLUX_MAX_PROMPT_CHARS = 2048;

/** Pasos recortados al rango del modelo elegido. */
export function clampSteps(steps: number | null | undefined, max = 8, def = 4): number {
  if (typeof steps !== 'number' || !Number.isFinite(steps)) return def;
  return Math.min(max, Math.max(1, Math.floor(steps)));
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
  supportsNegative: boolean;
  maxSteps: number;
  defaultSteps: number;
  /** Si true, el hint se recalcula con los pasos (coste variable). */
  variableCost?: boolean;
}

export const IMAGE_MODELS: ImageModelOption[] = [
  { provider: 'cloudflare', model: '@cf/black-forest-labs/flux-1-schnell', label: 'FLUX.1 schnell', costHint: '≈58 Neurons/imagen a 4 pasos', supportsSteps: true, supportsSeed: true, supportsNegative: false, maxSteps: 8, defaultSteps: 4, variableCost: true },
  { provider: 'cloudflare', model: '@cf/stabilityai/stable-diffusion-xl-base-1.0', label: 'SDXL Base 1.0', costHint: 'Coste no publicado por Cloudflare', supportsSteps: true, supportsSeed: true, supportsNegative: true, maxSteps: 20, defaultSteps: 20 },
  { provider: 'cloudflare', model: '@cf/bytedance/stable-diffusion-xl-lightning', label: 'SDXL Lightning', costHint: 'Coste no publicado por Cloudflare', supportsSteps: true, supportsSeed: true, supportsNegative: true, maxSteps: 20, defaultSteps: 20 },
  { provider: 'cloudflare', model: '@cf/lykon/dreamshaper-8-lcm', label: 'Dreamshaper 8 LCM', costHint: 'Coste no publicado por Cloudflare', supportsSteps: true, supportsSeed: true, supportsNegative: true, maxSteps: 20, defaultSteps: 20 },
  { provider: 'cloudflare', model: '@cf/leonardo/lucid-origin', label: 'Lucid Origin', costHint: '≈5.700 Neurons/imagen (1120²)', supportsSteps: true, supportsSeed: true, supportsNegative: false, maxSteps: 40, defaultSteps: 20, variableCost: true },
  { provider: 'cloudflare', model: '@cf/leonardo/phoenix-1.0', label: 'Phoenix 1.0', costHint: '≈2.400 Neurons/imagen (1024²)', supportsSteps: true, supportsSeed: true, supportsNegative: true, maxSteps: 50, defaultSteps: 25, variableCost: true },
  { provider: 'google', model: 'gemini-nano-banana-2.1', label: 'Nano Banana 2.1', costHint: '≈$0,0336/imagen (de pago)', supportsSteps: false, supportsSeed: false, supportsNegative: false, maxSteps: 1, defaultSteps: 1 },
  { provider: 'google', model: 'gemini-2.5-flash-image', label: 'Nano Banana (2.5)', costHint: '≈$0,039/imagen (de pago)', supportsSteps: false, supportsSeed: false, supportsNegative: false, maxSteps: 1, defaultSteps: 1 },
  { provider: 'google', model: 'gemini-3.1-flash-lite-image', label: 'Nano Banana Lite', costHint: '≈$0,0336/imagen (de pago)', supportsSteps: false, supportsSeed: false, supportsNegative: false, maxSteps: 1, defaultSteps: 1 },
];

/** Hint dinámico: los de coste variable recalculan con los pasos elegidos. */
export function dynamicCostHint(m: ImageModelOption, steps: number, measuredSchnell: number | null): string {
  if (m.model === '@cf/black-forest-labs/flux-1-schnell') {
    const est = Math.round(calibratedSchnellEstimate(steps, measuredSchnell));
    return `≈${est.toLocaleString('es-ES')} Neurons/imagen${measuredSchnell != null ? ' (tu medición)' : ''}`;
  }
  if (m.model === '@cf/leonardo/lucid-origin') {
    const s = Math.min(40, Math.max(1, Math.floor(steps)));
    return `≈${Math.round(9 * 636 + s * 12).toLocaleString('es-ES')} Neurons/imagen (1120²)`;
  }
  if (m.model === '@cf/leonardo/phoenix-1.0') {
    const s = Math.min(50, Math.max(1, Math.floor(steps)));
    return `≈${Math.round(4 * 530 + s * 10).toLocaleString('es-ES')} Neurons/imagen (1024²)`;
  }
  return m.costHint;
}

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

/** Coste Google según modelo y tamaño (pricing oficial ai.google.dev).
 * 2.1: 1K $0,0336 / 2K $0,0504. 2.5: $0,039. Lite: $0,0336. */
export function googleImageCost(model: string, size: string): number | null {
  if (model === 'gemini-nano-banana-2.1') return size === '2K' ? 0.0504 : 0.0336;
  if (model === 'gemini-2.5-flash-image') return 0.039;
  if (model === 'gemini-3.1-flash-lite-image') return 0.0336;
  return null;
}

/** Gasto acumulado local (estimado): Neurons de Cloudflare + USD de Google. */
export interface SpendTotal { neurons: number; usd: number }

export function addSpend(prev: SpendTotal, add: Partial<SpendTotal>): SpendTotal {
  const n = typeof add.neurons === 'number' && Number.isFinite(add.neurons) && add.neurons > 0 ? add.neurons : 0;
  const u = typeof add.usd === 'number' && Number.isFinite(add.usd) && add.usd > 0 ? add.usd : 0;
  return {
    neurons: Math.round((prev.neurons + n) * 10) / 10,
    usd: Math.round((prev.usd + u) * 10000) / 10000,
  };
}

export function formatSpend(s: SpendTotal): string {
  const parts: string[] = [];
  if (s.neurons > 0) parts.push(`≈${Math.round(s.neurons).toLocaleString('es-ES')} Neurons`);
  if (s.usd > 0) parts.push(`≈$${s.usd.toFixed(4)}`);
  return parts.length ? parts.join(' + ') : 'nada todavía';
}
