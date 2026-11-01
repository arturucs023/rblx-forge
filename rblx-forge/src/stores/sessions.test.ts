import { describe, expect, it } from 'vitest';
import { buildResumeContext, mergeArchived, messagesSig, type ArchivedChat } from './sessions';

const chat = (id: string, updatedAt: number): ArchivedChat => ({ id, title: id, updatedAt, modelLabel: null, messages: [] });

const msg = (role: string, text: string) => ({ id: `${role}-${text.slice(0, 8)}`, role, type: role === 'user' ? 'user' : 'assistant', text });

describe('mergeArchived', () => {
  it('pone el más reciente primero sin duplicados y respeta el tope', () => {
    const a = chat('a', 1);
    const b = chat('b', 2);
    expect(mergeArchived([b, a], { ...a, updatedAt: 3 })).toEqual([{ ...a, updatedAt: 3 }, b]);
    const many = Array.from({ length: 25 }, (_, i) => chat(`c${i}`, i));
    expect(mergeArchived(many, chat('nuevo', 99))).toHaveLength(20);
    expect(mergeArchived(many, chat('nuevo', 99))[0].id).toBe('nuevo');
  });
});

describe('messagesSig', () => {
  it('detecta cambios de contenido y longitud', () => {
    const a = [{ id: '1', text: 'hola' }];
    expect(messagesSig([])).toBe('0');
    expect(messagesSig(a)).toBe(messagesSig([{ id: '1', text: 'hola' }]));
    expect(messagesSig(a)).not.toBe(messagesSig([{ id: '1', text: 'hola!' }]));
    expect(messagesSig(a)).not.toBe(messagesSig([...a, { id: '2', text: 'x' }]));
  });
});

describe('buildResumeContext', () => {
  it('incluye título, modelo y turnos con tope', () => {
    const a: ArchivedChat = {
      ...chat('abc', 1700000000000),
      title: 'Mi juego',
      modelLabel: 'opencode/mimo',
      messages: [msg('user', 'hola'), msg('assistant', 'buenas'), msg('user', 'x'.repeat(5000))] as never,
    };
    const ctx = buildResumeContext(a);
    expect(ctx).toContain('Mi juego');
    expect(ctx).toContain('opencode/mimo');
    expect(ctx).toContain('Usuario: hola');
    expect(ctx).toContain('Asistente: buenas');
    expect(ctx).toContain('Confirma en una línea');
    expect(ctx.length).toBeLessThanOrEqual(7000);
  });
  it('chat vacío no rompe', () => {
    const ctx = buildResumeContext(chat('vacio', 1));
    expect(ctx).toContain('vacio');
  });
});
