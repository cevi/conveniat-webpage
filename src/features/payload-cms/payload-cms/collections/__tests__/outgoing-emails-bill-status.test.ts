jest.mock('@/config/environment-variables', () => ({
  environmentVariables: { CEVIDB_GROUP_FULL_ADMIN: [541] },
}));
jest.mock('@/features/payload-cms/payload-cms/endpoints/override-outgoing-email', () => ({
  overrideOutgoingEmailStatusHandler: jest.fn(),
}));
jest.mock('@/features/payload-cms/payload-cms/endpoints/resend-outgoing-email', () => ({
  resendOutgoingEmailHandler: jest.fn(),
}));
const mockMarkBillMailSent = jest.fn();
const mockMarkBillMailFailed = jest.fn();
jest.mock('@/features/billing/services/bill-mail-status', () => ({
  billParticipantIdOf: ({ billParticipant }: { billParticipant: string | null }): unknown =>
    billParticipant ?? undefined,
  markBillMailSent: (...args: unknown[]): unknown => mockMarkBillMailSent(...args),
  markBillMailFailed: (...args: unknown[]): unknown => mockMarkBillMailFailed(...args),
}));

import { OutgoingEmails } from '@/features/payload-cms/payload-cms/collections/outgoing-emails';
import type { CollectionAfterChangeHook } from 'payload';

const afterChange = OutgoingEmails.hooks?.afterChange?.[0] as CollectionAfterChangeHook;

const runHook = async (
  previous: string,
  next: string,
  context: Record<string, unknown> = {},
  billParticipant: string | null = 'p1',
): Promise<void> => {
  await afterChange({
    doc: { id: 'mail-1', to: 'eltern@example.com', deliveryStatus: next, billParticipant },
    previousDoc: { deliveryStatus: previous },
    req: { context, payload: { logger: { error: jest.fn() } } },
  } as never);
};

describe('a bill follows the delivery of its mail', () => {
  beforeEach(() => {
    mockMarkBillMailSent.mockReset();
    mockMarkBillMailFailed.mockReset();
  });

  it('is marked sent once its mail has left', async () => {
    await runHook('pending', 'success');

    expect(mockMarkBillMailSent).toHaveBeenCalledWith(
      expect.anything(),
      'p1',
      expect.objectContaining({ id: 'mail-1' }),
    );
    expect(mockMarkBillMailFailed).not.toHaveBeenCalled();
  });

  it.each([
    ['could not be sent', 'pending'],
    ['bounced after it had left', 'success'],
  ])('is parked for review when its mail %s', async (_, previous) => {
    await runHook(previous, 'error');

    expect(mockMarkBillMailFailed).toHaveBeenCalledWith(
      expect.anything(),
      'p1',
      expect.objectContaining({ id: 'mail-1' }),
    );
  });

  it('is left alone when the queue discarded an overtaken mail', async () => {
    await runHook('queued', 'error', { mailDiscarded: true });

    expect(mockMarkBillMailFailed).not.toHaveBeenCalled();
  });

  it('is not parked a second time by another report on a mail that already failed', async () => {
    await runHook('error', 'error');

    expect(mockMarkBillMailFailed).not.toHaveBeenCalled();
  });

  it('ignores mails that are not a bill', async () => {
    // eslint-disable-next-line unicorn/no-null -- what Payload stores for an empty relationship
    await runHook('pending', 'error', {}, null);

    expect(mockMarkBillMailFailed).not.toHaveBeenCalled();
  });

  it('keeps the delivery status when the bill cannot be updated', async () => {
    mockMarkBillMailFailed.mockRejectedValue(new Error('Mongo is down'));

    await expect(runHook('pending', 'error')).resolves.toBeUndefined();
  });
});
