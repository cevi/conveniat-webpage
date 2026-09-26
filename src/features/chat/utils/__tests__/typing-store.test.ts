import {
  clearTyping,
  getTypists,
  recordTyping,
  subscribeTyping,
  TYPING_TTL_MS,
} from '@/features/chat/utils/typing-store';

describe('typing store', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    clearTyping('chat-1', 'anna');
    clearTyping('chat-1', 'anna', 'thread-1');
    jest.useRealTimers();
  });

  test('the dots go away on their own once the signals stop', () => {
    recordTyping('chat-1', 'anna', 'Anna');
    expect(getTypists('chat-1').map((t) => t.name)).toEqual(['Anna']);

    jest.advanceTimersByTime(TYPING_TTL_MS - 100);
    recordTyping('chat-1', 'anna', 'Anna');
    jest.advanceTimersByTime(TYPING_TTL_MS - 100);
    expect(getTypists('chat-1')).toHaveLength(1);

    jest.advanceTimersByTime(200);
    expect(getTypists('chat-1')).toHaveLength(0);
  });

  test('the arriving message clears its sender at once', () => {
    recordTyping('chat-1', 'anna', 'Anna');
    clearTyping('chat-1', 'anna');
    expect(getTypists('chat-1')).toHaveLength(0);
  });

  test('typing in a thread does not show in the main list', () => {
    recordTyping('chat-1', 'anna', 'Anna', 'thread-1');
    expect(getTypists('chat-1')).toHaveLength(0);
    expect(getTypists('chat-1', 'thread-1')).toHaveLength(1);
  });

  test('a repeated signal does not re-render listeners', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeTyping(listener);
    recordTyping('chat-1', 'anna', 'Anna');
    const snapshot = getTypists('chat-1');
    recordTyping('chat-1', 'anna', 'Anna');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(getTypists('chat-1')).toBe(snapshot);
    unsubscribe();
  });
});
