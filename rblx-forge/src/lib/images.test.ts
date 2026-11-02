// Tests puros del modo Imágenes (sin red ni Tauri).
import { describe, expect, it } from 'vitest';
import { clampSteps, classifyToken, formatBytes, imageErrorMessage, normalizeSeed, tokenVerifyAdvice, validatePrompt } from './images';

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
});

describe('formatBytes', () => {
  it('unidades legibles', () => {
    expect(formatBytes(500)).toBe('500 B');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(3 * 1024 * 1024)).toBe('3.00 MB');
  });
});
