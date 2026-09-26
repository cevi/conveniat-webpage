/**
 * @jest-environment jsdom
 */

import { getChatDraftKey, useChatDraft } from '@/features/chat/hooks/use-chat-draft';
import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';

const useComposer = (draftKey: string, initial = ''): [string, (text: string) => void] => {
  const [value, setValue] = useState(initial);
  useChatDraft(draftKey, value, setValue);
  return [value, (text: string): void => setValue(() => text)];
};

describe('useChatDraft', () => {
  const key = getChatDraftKey('chat-1');

  beforeEach(() => localStorage.clear());

  test('text typed before leaving the chat is back when returning', () => {
    const first = renderHook(() => useComposer(key));
    act(() => first.result.current[1]('half a thought'));
    first.unmount();

    const second = renderHook(() => useComposer(key));
    expect(second.result.current[0]).toBe('half a thought');
  });

  test('sending (clearing the composer) drops the draft', () => {
    const first = renderHook(() => useComposer(key));
    act(() => first.result.current[1]('sent already'));
    act(() => first.result.current[1](''));
    first.unmount();

    expect(renderHook(() => useComposer(key)).result.current[0]).toBe('');
  });

  test('a thread keeps its own draft', () => {
    const main = renderHook(() => useComposer(key));
    act(() => main.result.current[1]('for everyone'));

    const thread = renderHook(() => useComposer(getChatDraftKey('chat-1', 'thread-9')));
    expect(thread.result.current[0]).toBe('');
  });

  test('shared text wins over a stored draft', () => {
    localStorage.setItem(key, 'old draft');
    const { result } = renderHook(() => useComposer(key, 'https://example.com'));
    expect(result.current[0]).toBe('https://example.com');
  });
});
