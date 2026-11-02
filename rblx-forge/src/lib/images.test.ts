// Tests puros del modo Imágenes (sin red ni Tauri).
import { describe, expect, it } from 'vitest';
import { clampSteps, classifyToken, formatBytes, addSpend, dynamicCostHint, formatSpend, googleImageCost, imageErrorMessage, normalizeSeed, pastedImageName, isImageChipName, schnellEstimate, tokenVerifyAdvice, validatePrompt, IMAGE_MODELS } from './images';

describe('classifyToken', () => {
  it('orienta sin bloquear', () => {
    expect(classifyToken('')).toBe('empty');
    expect(classifyToken('0f1e2d3c4b5a69788796a5b4c3d2e1f0')).toBe('maybe-account-id');
    expect(classifyToken('cfat...0ce8')).toBe('short');
    expect(classifyToken('x'.repeat(40))).toBe('maybe-token');
  });
});

describe('clampSteps', () => {
  it('defecto 4 y recorte 1..=8', () => {
    expect(clampSteps(undefined)).toBe(4);
    expect(clampSteps(null)).toBe(4);
    expect(clampSteps(Number.NaN)).toBe(4);
    expect(clampSteps(0)).toBe(1);
    expect(clampSteps(99)).toBe(8);
    expect(clampSteps(6.7)).toBe(6);
    expect(clampSteps(99, 50, 25)).toBe(50);
    expect(clampSteps(undefined, 50, 25)).toBe(25);
  });
});

describe('validatePrompt', () => {
  it('vacío y largo fallan', () => {
    expect(validatePrompt('   ')).toContain('Describe');
    expect(validatePrompt('un castillo')).toBeNull();
    expect(validatePrompt('x'.repeat(2049))).toContain('2048');
    expect(validatePrompt('x'.repeat(2048))).toBeNull();
  });
});

describe('normalizeSeed', () => {
  it('vacío = aleatoria, resto entero ≥0', () => {
    expect(normalizeSeed('')).toBeUndefined();
    expect(normalizeSeed('42')).toBe(42);
    expect(normalizeSeed(' 7 ')).toBe(7);
    expect(normalizeSeed('-3')).toBeUndefined();
    expect(normalizeSeed('abc')).toBeUndefined();
  });
});

describe('imageErrorMessage', () => {
  it('mapea auth y cuota a mensajes claros', () => {
    expect(imageErrorMessage('auth error 401')).toContain('API token');
    expect(imageErrorMessage('quota neurons')).toContain('cuota');
    expect(imageErrorMessage('Falta el API token')).toContain('Falta');
  });
  it('los fallos de red muestran el detalle real, no un genérico', () => {
    const raw = 'Conexión rechazada o bloqueada hacia api.cloudflare.com: Connection refused';
    expect(imageErrorMessage(raw)).toBe(raw);
  });
  it('token inválido da consejo accionable', () => {
    const advice = tokenVerifyAdvice('{"code":1000,"message":"Invalid API Token"}');
    expect(advice).toContain('una sola vez');
    expect(tokenVerifyAdvice('Token válido y activo')).toBeNull();
  });
  it('etiquetas [Image N] y detección de chip', () => {
    expect(pastedImageName(1)).toBe('[Image 1]');
    expect(pastedImageName(2)).toBe('[Image 2]');
    expect(isImageChipName('[Image 3].png')).toBe(true);
    expect(isImageChipName('foto.png')).toBe(false);
  });
  it('catálogo con coste aprox por imagen', () => {
    // 6 Cloudflare text-to-image (contrato JSON verificado) + 3 Google.
    expect(IMAGE_MODELS.length).toBe(9);
    expect(IMAGE_MODELS.filter((m) => m.provider === 'cloudflare').length).toBe(6);
    expect(IMAGE_MODELS.filter((m) => m.provider === 'google').length).toBe(3);
    expect(IMAGE_MODELS[0].supportsSteps).toBe(true);
    expect(IMAGE_MODELS.find((m) => m.model === 'gemini-nano-banana-2.1')!.supportsSteps).toBe(false);
    expect(schnellEstimate(4)).toBeCloseTo(57.6, 1);
    expect(schnellEstimate(8)).toBeCloseTo(96, 0);
    expect(IMAGE_MODELS.every((m) => m.costHint.includes('≈') || m.costHint.includes('no publicado'))).toBe(true);
  });
  it('hint dinámico con pasos y calibración', () => {
    const schnell = IMAGE_MODELS.find((m) => m.model.includes('flux-1-schnell'))!;
    const lucid = IMAGE_MODELS.find((m) => m.model.includes('lucid-origin'))!;
    expect(dynamicCostHint(schnell, 4, null)).toContain('58');
    expect(dynamicCostHint(schnell, 4, 173)).toContain('173');
    expect(dynamicCostHint(lucid, 20, null).replace(/[.,]/g, '')).toContain('5964');
    const sdxl = IMAGE_MODELS.find((m) => m.model.includes('stable-diffusion-xl-base'))!;
    expect(dynamicCostHint(sdxl, 20, null)).toBe(sdxl.costHint);
  });
  it('coste Google por tamaño y gasto acumulado', () => {
    expect(googleImageCost('gemini-nano-banana-2.1', '1K')).toBe(0.0336);
    expect(googleImageCost('gemini-nano-banana-2.1', '2K')).toBe(0.0504);
    expect(googleImageCost('gemini-2.5-flash-image', '2K')).toBe(0.039);
    expect(googleImageCost('otro', '1K')).toBeNull();
    const s = addSpend({ neurons: 173, usd: 0 }, { usd: 0.0336 });
    expect(s.neurons).toBe(173);
    expect(s.usd).toBeCloseTo(0.0336, 4);
    expect(formatSpend({ neurons: 0, usd: 0 })).toBe('nada todavía');
  });
});

describe('formatBytes', () => {
  it('unidades legibles', () => {
    expect(formatBytes(500)).toBe('500 B');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(3 * 1024 * 1024)).toBe('3.00 MB');
  });
});
