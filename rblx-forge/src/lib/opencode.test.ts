import { describe, expect, it } from 'vitest';
import { isAssistantMessage, isUserMessage } from './opencode';

describe('message role/type detection (contrato real v2.2.4: type)', () => {
  it('acepta type y role', () => {
    expect(isAssistantMessage({ type: 'assistant' })).toBe(true);
    expect(isAssistantMessage({ type: 'assistant-message' })).toBe(true);
    expect(isAssistantMessage({ role: 'assistant' })).toBe(true);
    expect(isAssistantMessage({ type: 'user' })).toBe(false);
    expect(isAssistantMessage({ type: 'idle' })).toBe(false);
    expect(isAssistantMessage(null)).toBe(false);
    expect(isUserMessage({ type: 'user' })).toBe(true);
    expect(isUserMessage({ role: 'user' })).toBe(true);
    expect(isUserMessage({ type: 'assistant' })).toBe(false);
  });
});
