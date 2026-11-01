import { describe, expect, it } from 'vitest';
import { mergeArchived, messagesSig, type ArchivedChat } from './sessions';

const chat = (id: string, updatedAt: number): ArchivedChat => ({ id, title: id, updatedAt, modelLabel: null, messages: [] });

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
