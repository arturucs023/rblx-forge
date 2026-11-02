import { describe, expect, it } from 'vitest';
import { diffLines, diffStats } from './diff';
import { eventToFeed, trackToolCall, type TrackedCall } from './activity';

describe('diffLines', () => {
  it('idénticos → todo contexto', () => {
    const r = diffLines('a\nb', 'a\nb')!;
    expect(r.every((l) => l.type === ' ')).toBe(true);
  });
  it('inserción y borrado', () => {
    const r = diffLines('a\nb\nc', 'a\nx\nc')!;
    const s = diffStats(r);
    expect(s).toEqual({ add: 1, del: 1, same: 2 });
    expect(r.map((l) => l.type).join('')).toBe(' +- ');
  });
  it('archivos grandes → null honesto', () => {
    const big = Array(4000).fill('x').join('\n');
    expect(diffLines(big, 'y')).toBeNull();
  });
});

describe('eventToFeed', () => {
  it('clasifica prompt y ejecución', () => {
    const f1 = eventToFeed({ type: 'session.inbox.enqueued', data: { item: { payload: { text: 'hola' } } } }, null, 1);
    expect(f1[0].kind).toBe('mensaje');
    const f2 = eventToFeed({ type: 'session.execution.failed', data: {} }, null, 2);
    expect(f2[0].kind).toBe('error');
  });
  it('lo desconocido no-sesión se ignora, lo de sesión se registra genérico', () => {
    expect(eventToFeed({ type: 'project.updated' }, null, 1)).toEqual([]);
    expect(eventToFeed({ type: 'session.algo-nuevo', data: {} }, null, 1)[0].kind).toBe('sistema');
  });
  it('los deltas de streaming no inundan el feed', () => {
    expect(eventToFeed({ type: 'session.text.delta', data: {} }, null, 1)).toEqual([]);
  });
});

describe('trackToolCall', () => {
  it('join por call id con archivos', () => {
    const known = new Map<string, TrackedCall>();
    const t1 = trackToolCall({ type: 'session.tool.input.started', data: { id: 'c1', name: 'read' } }, known, 1);
    expect(t1.call?.name).toBe('read');
    known.set('c1', t1.call!);
    const t2 = trackToolCall({ type: 'session.tool.called', data: { id: 'c1', input: { path: 'C:\\a\\b.lua' } } }, known, 2);
    expect(t2.updateCall?.patch.files?.[0]).toMatchObject({ kind: 'leído' });
    const t3 = trackToolCall({ type: 'session.tool.success', data: { id: 'c1', content: [{ text: 'ok' }] } }, known, 3);
    expect(t3.updateCall?.patch.status).toBe('ok');
  });
});
