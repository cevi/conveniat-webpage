import type { ThreadSummary } from '@/features/chat/api/types';
import { addReplyToThreadSummary, formatLastReplyTime } from '@/features/chat/utils/thread-summary';

describe('formatLastReplyTime', () => {
  // 21:30 in Zurich on 25 July, 19:30 UTC
  const NOW = new Date(Date.UTC(2027, 6, 25, 19, 30));

  it('shows the time of a reply on the same camp day', () => {
    expect(formatLastReplyTime(new Date(Date.UTC(2027, 6, 25, 12, 5)), 'de', NOW)).toBe('14:05');
  });

  it('goes by the camp clock, not the phone: 23:30 UTC is already the next day in Zurich', () => {
    const lateEvening = new Date(Date.UTC(2027, 6, 24, 23, 30));
    expect(formatLastReplyTime(lateEvening, 'de', NOW)).toBe('01:30');
  });

  it('shows the day of an older reply', () => {
    const earlier = new Date(Date.UTC(2027, 6, 22, 9, 0));
    expect(formatLastReplyTime(earlier, 'de', NOW)).toBe('22. Juli');
    expect(formatLastReplyTime(earlier, 'fr', NOW)).toBe('22 juil.');
    expect(formatLastReplyTime(earlier, 'en', NOW)).toBe('Jul 22');
  });

  it('reads a time that came over the stream as a string', () => {
    expect(formatLastReplyTime('2027-07-25T12:05:00.000Z', 'en', NOW)).toBe('14:05');
  });

  it('shows nothing for a date it cannot read', () => {
    expect(formatLastReplyTime('not a date', 'de', NOW)).toBe('');
  });
});

describe('addReplyToThreadSummary', () => {
  const at = new Date(Date.UTC(2027, 6, 25, 12, 0));
  const summary: ThreadSummary = {
    lastReplyAt: new Date(Date.UTC(2027, 6, 25, 11, 0)),
    repliers: [
      { id: 'ben', name: 'Ben Muster', pictureUrl: '/api/profile-pictures/ben?v=1' },
      { id: 'clara', name: 'Clara Muster' },
    ],
    replierCount: 2,
  };

  it('puts a new person in front and counts them', () => {
    expect(
      addReplyToThreadSummary(summary, 3, {
        senderId: 'david',
        senderName: 'David Muster',
        createdAt: at,
      }),
    ).toEqual({
      lastReplyAt: at,
      repliers: [
        { id: 'david', name: 'David Muster' },
        { id: 'ben', name: 'Ben Muster', pictureUrl: '/api/profile-pictures/ben?v=1' },
        { id: 'clara', name: 'Clara Muster' },
      ],
      replierCount: 3,
    });
  });

  it('moves someone who replied before to the front, keeps their picture, counts no one new', () => {
    const next = addReplyToThreadSummary(summary, 3, {
      senderId: 'clara',
      senderName: 'Clara Muster',
      createdAt: at.toISOString() as unknown as Date,
    });
    expect(next?.repliers.map((replier) => replier.id)).toEqual(['clara', 'ben']);
    expect(next?.replierCount).toBe(2);
    expect(next?.lastReplyAt).toEqual(at);
  });

  it('starts a summary with the first reply', () => {
    expect(
      addReplyToThreadSummary(undefined, 0, { senderId: 'ben', senderName: 'Ben', createdAt: at }),
    ).toEqual({ lastReplyAt: at, repliers: [{ id: 'ben', name: 'Ben' }], replierCount: 1 });
  });

  it('does not invent a summary for a thread an old cache knows only by its count', () => {
    expect(
      addReplyToThreadSummary(undefined, 4, { senderId: 'ben', senderName: 'Ben', createdAt: at }),
    ).toBeUndefined();
  });
});
