/**
 * @jest-environment jsdom
 */

import {
  CHAT_DELETION_UNDO_MS,
  usePendingChatDeletion,
} from '@/features/chat/hooks/use-pending-chat-deletion';
import { act, renderHook } from '@testing-library/react';

const mutate = jest.fn();
jest.mock('@/features/chat/hooks/use-archive-chat-mutation', () => ({
  useArchiveChatMutation: (): { mutate: jest.Mock } => ({ mutate }),
}));

const setVisibility = (state: DocumentVisibilityState): void => {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
};

describe('usePendingChatDeletion', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mutate.mockClear();
  });
  afterEach(() => {
    setVisibility('visible');
    jest.useRealTimers();
  });

  it('hides the chat at once and tells the server only once the moment to undo has passed', () => {
    const { result } = renderHook(() => usePendingChatDeletion());

    act(() => result.current.deleteChat('chat-a'));
    expect(result.current.chatId).toBe('chat-a');

    act(() => jest.advanceTimersByTime(CHAT_DELETION_UNDO_MS - 1));
    expect(mutate).not.toHaveBeenCalled();

    act(() => jest.advanceTimersByTime(1));
    expect(mutate).toHaveBeenCalledWith({ chatUuid: 'chat-a' });
    expect(result.current.chatId).toBeUndefined();
  });

  it('sends nothing when the delete is undone', () => {
    const { result } = renderHook(() => usePendingChatDeletion());

    act(() => result.current.deleteChat('chat-a'));
    act(() => result.current.undo());
    act(() => jest.advanceTimersByTime(CHAT_DELETION_UNDO_MS * 2));

    expect(mutate).not.toHaveBeenCalled();
    expect(result.current.chatId).toBeUndefined();
  });

  it('sends a pending delete at once when another chat is deleted', () => {
    const { result } = renderHook(() => usePendingChatDeletion());

    act(() => result.current.deleteChat('chat-a'));
    act(() => result.current.deleteChat('chat-b'));

    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledWith({ chatUuid: 'chat-a' });
    expect(result.current.chatId).toBe('chat-b');
  });

  it('sends a pending delete when the list is left or the app goes to the background', () => {
    const { result, unmount } = renderHook(() => usePendingChatDeletion());

    act(() => result.current.deleteChat('chat-a'));
    act(() => setVisibility('hidden'));
    expect(mutate).toHaveBeenCalledWith({ chatUuid: 'chat-a' });

    act(() => result.current.deleteChat('chat-b'));
    unmount();
    expect(mutate).toHaveBeenCalledWith({ chatUuid: 'chat-b' });
    expect(mutate).toHaveBeenCalledTimes(2);
  });
});
