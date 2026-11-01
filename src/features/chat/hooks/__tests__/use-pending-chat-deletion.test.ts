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

const chatA = { chatId: 'chat-a', forEveryone: true };
const chatB = { chatId: 'chat-b', forEveryone: false };

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

    act(() => result.current.deleteChat(chatA));
    expect(result.current.pending).toEqual(chatA);

    act(() => jest.advanceTimersByTime(CHAT_DELETION_UNDO_MS - 1));
    expect(mutate).not.toHaveBeenCalled();

    act(() => jest.advanceTimersByTime(1));
    expect(mutate).toHaveBeenCalledWith({ chatUuid: 'chat-a' });
    expect(result.current.pending).toBeUndefined();
  });

  it('sends nothing when the delete is undone', () => {
    const { result } = renderHook(() => usePendingChatDeletion());

    act(() => result.current.deleteChat(chatA));
    act(() => result.current.undo());
    act(() => jest.advanceTimersByTime(CHAT_DELETION_UNDO_MS * 2));

    expect(mutate).not.toHaveBeenCalled();
    expect(result.current.pending).toBeUndefined();
  });

  it('stops the time while the undo is held and gives the full time again once let go', () => {
    const { result } = renderHook(() => usePendingChatDeletion());

    act(() => result.current.deleteChat(chatA));
    act(() => jest.advanceTimersByTime(CHAT_DELETION_UNDO_MS - 1000));
    act(() => result.current.hold(true));
    act(() => jest.advanceTimersByTime(CHAT_DELETION_UNDO_MS * 3));
    expect(mutate).not.toHaveBeenCalled();

    act(() => result.current.hold(false));
    act(() => jest.advanceTimersByTime(CHAT_DELETION_UNDO_MS - 1));
    expect(mutate).not.toHaveBeenCalled();
    act(() => jest.advanceTimersByTime(1));
    expect(mutate).toHaveBeenCalledWith({ chatUuid: 'chat-a' });
  });

  it('sends a pending delete at once when another chat is deleted', () => {
    const { result } = renderHook(() => usePendingChatDeletion());

    act(() => result.current.deleteChat(chatA));
    act(() => result.current.deleteChat(chatB));

    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledWith({ chatUuid: 'chat-a' });
    expect(result.current.pending).toEqual(chatB);
  });

  it('sends a pending delete when the chats are left or the app goes to the background', () => {
    const { result, unmount } = renderHook(() => usePendingChatDeletion());

    act(() => result.current.deleteChat(chatA));
    act(() => setVisibility('hidden'));
    expect(mutate).toHaveBeenCalledWith({ chatUuid: 'chat-a' });

    act(() => result.current.deleteChat(chatB));
    unmount();
    expect(mutate).toHaveBeenCalledWith({ chatUuid: 'chat-b' });
    expect(mutate).toHaveBeenCalledTimes(2);
  });
});
