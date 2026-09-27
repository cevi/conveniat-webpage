import type { ChatMessage } from '@/features/chat/api/types';
import { formatDayLabel, groupMessagesByDay } from '@/features/chat/utils/message-grouping';
import { MessageEventType, MessageType } from '@/lib/prisma/client';

const message = (
  id: string,
  senderId: string,
  createdAt: string,
  type: string = MessageType.TEXT_MSG,
): ChatMessage => ({
  id,
  senderId,
  createdAt: new Date(createdAt),
  messagePayload: { text: id },
  status: MessageEventType.STORED,
  type,
});

const positions = (messages: ChatMessage[]): string[] =>
  groupMessagesByDay(messages).flatMap((day) =>
    day.messages.map(
      ({ message: m, isFirstInGroup, isLastInGroup }) =>
        `${m.id}:${isFirstInGroup ? 'first' : ''}${isLastInGroup ? 'last' : ''}`,
    ),
  );

describe('groupMessagesByDay', () => {
  test('a quick run from one sender is one block', () => {
    expect(
      positions([
        message('a', 'anna', '2026-09-26T10:00:00'),
        message('b', 'anna', '2026-09-26T10:00:30'),
        message('c', 'anna', '2026-09-26T10:01:10'),
      ]),
    ).toEqual(['a:first', 'b:', 'c:last']);
  });

  test('another sender or a long pause starts a new block', () => {
    expect(
      positions([
        message('a', 'anna', '2026-09-26T10:00:00'),
        message('b', 'ben', '2026-09-26T10:00:10'),
        message('c', 'ben', '2026-09-26T10:05:00'),
      ]),
    ).toEqual(['a:firstlast', 'b:firstlast', 'c:firstlast']);
  });

  test('a system message breaks the block around it', () => {
    expect(
      positions([
        message('a', 'anna', '2026-09-26T10:00:00'),
        message('s', 'anna', '2026-09-26T10:00:05', MessageType.SYSTEM_MSG),
        message('b', 'anna', '2026-09-26T10:00:10'),
      ]),
    ).toEqual(['a:firstlast', 's:firstlast', 'b:firstlast']);
  });

  test('splits on the local calendar day, even inside the grouping window', () => {
    const days = groupMessagesByDay([
      message('a', 'anna', '2026-09-25T23:59:30'),
      message('b', 'anna', '2026-09-26T00:00:10'),
    ]);
    expect(days.map((day) => day.dayKey)).toEqual(['2026-09-25', '2026-09-26']);
    expect(days[1]?.messages[0]?.isFirstInGroup).toBe(true);
  });
});

describe('formatDayLabel', () => {
  const now = new Date('2026-09-26T12:00:00');

  test('names today and yesterday in every locale', () => {
    expect(formatDayLabel(new Date('2026-09-26T08:00:00'), 'de', now)).toBe('Heute');
    expect(formatDayLabel(new Date('2026-09-25T23:00:00'), 'fr', now)).toBe('Hier');
    expect(formatDayLabel(new Date('2026-09-25T01:00:00'), 'en', now)).toBe('Yesterday');
  });

  test('uses the weekday within the last week', () => {
    expect(formatDayLabel(new Date('2026-09-22T08:00:00'), 'de', now)).toBe('Dienstag');
  });

  test('adds the year only for another year', () => {
    expect(formatDayLabel(new Date('2026-09-01T08:00:00'), 'en', now)).not.toMatch(/2026/);
    expect(formatDayLabel(new Date('2025-09-01T08:00:00'), 'en', now)).toMatch(/2025/);
  });
});
