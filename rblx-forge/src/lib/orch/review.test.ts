import { describe, expect, it } from 'vitest';
import { findLastRejection, formatReviewFeedback } from './review';

describe('formatReviewFeedback', () => {
  it('ordena issues > notes > missing y limita tamaño', () => {
    const out = formatReviewFeedback('Tarea X', {
      verdict: 'REJECT',
      notes: ['bien encaminado'],
      issues: ['falta validar NaN', 'sin rate-limit'],
      missing: ['rendimiento con 100 NPCs'],
    });
    expect(out).toContain('Tarea X');
    expect(out).toContain('RECHAZADO');
    expect(out.indexOf('Fallos')).toBeLessThan(out.indexOf('Notas'));
    expect(out).toContain('falta validar NaN');
    expect(out).toContain('No verificado');
    expect(out.length).toBeLessThanOrEqual(4000);
  });
  it('sin detalle genera instrucción genérica útil', () => {
    const out = formatReviewFeedback('T', { verdict: 'REJECT' });
    expect(out).toContain('criterios de aceptación');
  });
});

describe('findLastRejection', () => {
  const msgs = [
    { kind: 'REVIEW_REQUESTED', task_id: 'a', content: 'x' },
    { kind: 'REVIEW_REJECTED', task_id: 'a', content: 'primero' },
    { kind: 'REVIEW_REJECTED', task_id: 'b', content: 'otra' },
    { kind: 'REVIEW_REJECTED', task_id: 'a', content: 'último' },
  ];
  it('devuelve el último rechazo de esa tarea', () => {
    expect(findLastRejection(msgs, 'a')).toBe('último');
    expect(findLastRejection(msgs, 'b')).toBe('otra');
    expect(findLastRejection(msgs, 'zzz')).toBeNull();
  });
});
