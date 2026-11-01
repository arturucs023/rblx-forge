import { describe, expect, it } from 'vitest';
import {
  assistantTexts,
  formatMs,
  toolDurationMs,
  toolError,
  toolInputPreview,
  toolName,
  toolOutput,
  toolParts,
  toolStatus,
  userFiles,
  userText,
  type ChatAttachment,
} from './text';
import type { SessionMessage } from '../opencode';

const userMsg = (over: Record<string, unknown> = {}): SessionMessage =>
  ({ id: 'u1', type: 'user', ...over } as unknown as SessionMessage);

describe('userText/userFiles (payload real del servidor)', () => {
  it('lee payload.text y respeta text superior', () => {
    expect(userText(userMsg({ payload: { text: 'hola' } }))).toBe('hola');
    expect(userText(userMsg({ text: 'directo' }))).toBe('directo');
    expect(userText(userMsg({}))).toBe('');
  });
  it('normaliza adjuntos y deriva nombre del uri', () => {
    const files = userFiles(
      userMsg({ payload: { files: [{ uri: 'file:///C:/a/nota.lua' }, { uri: '', name: 'x' }, null, { uri: 'file:///b.md', name: 'Leeme' }] } }),
    );
    expect(files).toEqual<ChatAttachment[]>([
      { uri: 'file:///C:/a/nota.lua', name: 'nota.lua' },
      { uri: 'file:///b.md', name: 'Leeme' },
    ]);
  });
});

const assistantMsg = (content: unknown[]): SessionMessage =>
  ({ id: 'a1', type: 'assistant', content } as unknown as SessionMessage);

describe('bloques del asistente', () => {
  it('separa textos y tools (content y parts legacy)', () => {
    const m = assistantMsg([{ type: 'text', text: 'hola' }, { type: 'tool', name: 'read' }]);
    expect(assistantTexts(m)).toEqual(['hola']);
    expect(toolParts(m)).toHaveLength(1);
    const legacy = { id: 'a2', parts: [{ type: 'tool', name: 'x' }] } as unknown as SessionMessage;
    expect(toolParts(legacy)).toHaveLength(1);
  });
});

describe('tool status/output/error/duración', () => {
  const ok = {
    type: 'tool', name: 'read',
    state: { status: 'completed', input: { path: 'C:/f.txt', other: 3 }, content: [{ type: 'text', text: 'A'.repeat(5000) }] },
    time: { created: 1, ran: 100, completed: 1350 },
  };
  const bad = { type: 'tool', name: 'read', state: { status: 'error', input: {}, error: { type: 'tool.execution', message: 'File not found' } } };
  const pend = { type: 'tool', name: 'write', state: {} };

  it('status honesto según streaming', () => {
    expect(toolStatus(ok as never, false)).toBe('completed');
    expect(toolStatus(bad as never, true)).toBe('error');
    expect(toolStatus(pend as never, true)).toBe('running');
    expect(toolStatus(pend as never, false)).toBe('pending');
  });
  it('nombre, input preview y truncado', () => {
    expect(toolName(ok as never)).toBe('read');
    expect(toolName({ type: 'tool' } as never)).toBe('herramienta');
    expect(toolInputPreview(ok as never)).toBe('C:/f.txt');
    const cut = toolInputPreview(ok as never, 5);
    expect(cut.endsWith('…')).toBe(true);
    expect(cut.length).toBeLessThanOrEqual(6);
    expect(toolInputPreview(pend as never)).toBe('');
  });
  it('output con tope y error real', () => {
    const out = toolOutput(ok as never, 100)!;
    expect(out.length).toBeLessThanOrEqual(100 + '…(truncado)'.length + 1);
    expect(toolOutput(bad as never)).toBeNull();
    expect(toolError(bad as never)).toBe('File not found');
    expect(toolError(ok as never)).toBeNull();
  });
  it('duración solo con tiempos válidos', () => {
    expect(toolDurationMs(ok as never)).toBe(1250);
    expect(toolDurationMs(bad as never)).toBeNull();
    expect(toolDurationMs({ type: 'tool', time: { ran: 5, completed: 3 } } as never)).toBeNull();
    expect(formatMs(450)).toBe('450 ms');
    expect(formatMs(1500)).toBe('1.5 s');
  });
});
