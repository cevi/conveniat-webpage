/* eslint-disable unicorn/no-null */
import {
  markBillMailFailed,
  markBillMailSent,
  staleBillMailReason,
} from '@/features/billing/services/bill-mail-status';
import type { Payload } from 'payload';

const payloadDouble = (
  participant: Record<string, unknown> | null,
): { payload: Payload; update: jest.Mock } => {
  const update = jest.fn().mockResolvedValue({});
  const payload = {
    findByID: jest.fn().mockResolvedValue(participant),
    update,
    logger: { warn: jest.fn() },
  } as unknown as Payload;
  return { payload, update };
};

describe('markBillMailSent', () => {
  it('marks a bill as sent once its queued mail has left, and keeps the history it has now', async () => {
    const queued = {
      date: '2027-01-10T08:00:00.000Z',
      action: 'bill_queued_for_eltern@example.com',
    };
    const { payload, update } = payloadDouble({
      status: 'bill_mail_pending',
      syncHistory: [queued],
    });

    await markBillMailSent(payload, 'p1', 'eltern@example.com');

    const [[written]] = update.mock.calls as [
      [{ data: { status: string; billSentDate: string; syncHistory: { action: string }[] } }],
    ];
    expect(written.data.status).toBe('bill_sent');
    expect(typeof written.data.billSentDate).toBe('string');
    expect(written.data.syncHistory.map((entry) => entry.action)).toEqual([
      'bill_queued_for_eltern@example.com',
      'bill_sent_to_eltern@example.com',
    ]);
  });

  it.each(['bill_created', 'bill_sent', 'reminder_sent', 'needs_manual_review', 'removed'])(
    'leaves a registration in "%s" alone',
    async (status) => {
      const { payload, update } = payloadDouble({ status, syncHistory: [] });

      await markBillMailSent(payload, 'p1', 'eltern@example.com');

      expect(update).not.toHaveBeenCalled();
    },
  );
});

describe('markBillMailFailed', () => {
  const mail = { id: 'mail-1', to: 'eltern@example.com' };

  it.each(['bill_created', 'bill_mail_pending', 'bill_sent', 'reminder_sent'])(
    'parks a bill in "%s" for review once its mail bounced, and says why',
    async (status) => {
      const earlier = {
        date: '2027-01-10T08:00:00.000Z',
        action: 'bill_sent_to_eltern@example.com',
      };
      const { payload, update } = payloadDouble({ status, syncHistory: [earlier] });

      await markBillMailFailed(payload, 'p1', mail);

      const [[written]] = update.mock.calls as [
        [{ data: { status: string; syncHistory: { action: string; reviewReason?: string }[] } }],
      ];
      expect(written.data.status).toBe('needs_manual_review');
      expect(written.data.syncHistory[0]).toEqual(earlier);
      expect(written.data.syncHistory[1]?.reviewReason).toContain('eltern@example.com');
      expect(written.data.syncHistory[1]?.reviewReason).toContain('mail-1');
    },
  );

  it.each(['paid', 'removed', 'new', 'pflichtangaben_missing'])(
    'leaves a registration in "%s" alone',
    async (status) => {
      const { payload, update } = payloadDouble({ status, syncHistory: [] });

      await markBillMailFailed(payload, 'p1', mail);

      expect(update).not.toHaveBeenCalled();
    },
  );

  it('does nothing for a registration that no longer exists', async () => {
    const { payload, update } = payloadDouble(null);

    await markBillMailFailed(payload, 'p1', mail);

    expect(update).not.toHaveBeenCalled();
  });
});

describe('staleBillMailReason', () => {
  it('lets the mail of a bill that is still waiting for it go out', async () => {
    const { payload } = payloadDouble({ status: 'bill_mail_pending' });

    expect(await staleBillMailReason(payload, { billParticipant: 'p1' })).toBeUndefined();
  });

  it('stops the mail of a registration that was cancelled while it waited', async () => {
    const { payload } = payloadDouble({ status: 'removed' });

    expect(await staleBillMailReason(payload, { billParticipant: 'p1' })).toContain('removed');
  });

  it('stops the mail of a registration that no longer exists', async () => {
    const { payload } = payloadDouble(null);

    expect(
      await staleBillMailReason(payload, { billParticipant: { id: 'p1' } as never }),
    ).toContain('no longer exists');
  });

  it('has no opinion on a mail that is not a bill', async () => {
    const { payload } = payloadDouble(null);

    expect(await staleBillMailReason(payload, {})).toBeUndefined();
  });
});
