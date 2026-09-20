import {
  selectMessagesToProcess,
  type Pop3Message,
} from '@/features/payload-cms/payload-cms/tasks/fetch-smtp-bounces/message-selection';

const mailbox = (count: number, firstId = 1): Pop3Message[] =>
  Array.from({ length: count }, (_, index) => ({
    id: firstId + index,
    uid: `uid-${firstId + index}`,
  }));

describe('selectMessagesToProcess', () => {
  it('reads the newest messages first', () => {
    expect(selectMessagesToProcess(mailbox(5), new Set(), 2)).toEqual([
      { id: 5, uid: 'uid-5' },
      { id: 4, uid: 'uid-4' },
    ]);
  });

  it('reaches a new arrival even when more unusable messages than a run can read sit in front of it', () => {
    // The shared mailbox also collects DMARC reports and other deployments' notifications.
    // Those are never deleted, so once more than a run's worth of them accumulated at the
    // head of the mailbox, selecting by position stopped reaching anything newer. Every
    // conveniat27 delivery notification from 2026-07-24 on was left unread behind that wall.
    const ballast = mailbox(500);
    const arrival = { id: 501, uid: 'uid-501' };
    const alreadyRead = new Set(ballast.map(({ uid }) => uid));

    expect(selectMessagesToProcess([...ballast, arrival], alreadyRead, 100)).toEqual([arrival]);
  });

  it('works through a backlog a run at a time', () => {
    const backlog = mailbox(250);
    const firstRun = selectMessagesToProcess(backlog, new Set(), 100);
    const secondRun = selectMessagesToProcess(
      backlog,
      new Set(firstRun.map(({ uid }) => uid)),
      100,
    );

    expect(firstRun).toHaveLength(100);
    expect(firstRun[0]).toEqual({ id: 250, uid: 'uid-250' });
    expect(secondRun).toHaveLength(100);
    expect(secondRun[0]).toEqual({ id: 150, uid: 'uid-150' });
  });

  it('returns nothing once every message has been read', () => {
    const messages = mailbox(3);
    const alreadyRead = new Set(messages.map(({ uid }) => uid));

    expect(selectMessagesToProcess(messages, alreadyRead, 100)).toEqual([]);
  });

  it('leaves the mailbox listing it was given untouched', () => {
    const messages = mailbox(3);

    selectMessagesToProcess(messages, new Set(), 100);

    expect(messages).toEqual([
      { id: 1, uid: 'uid-1' },
      { id: 2, uid: 'uid-2' },
      { id: 3, uid: 'uid-3' },
    ]);
  });
});
