jest.mock('@/config/environment-variables', () => ({
  environmentVariables: { SMTP_USER: 'noreply@cevi.tools' },
}));

import { updateTrackingRecords } from '@/features/payload-cms/payload-cms/tasks/fetch-smtp-bounces/db';
import { sendTrackedEmail } from '@/features/payload-cms/payload-cms/utils/send-tracked-email';
import type { Payload } from 'payload';

type Row = Record<string, unknown> & { id: string };

interface World {
  payload: Payload;
  mails: Row[];
  suppressions: Row[];
  sendEmail: jest.Mock;
}

/** The two collections a send and a bounce touch, reduced to the queries made on them. */
const world = (suppressed: string[] = []): World => {
  const mails: Row[] = [];
  const suppressions: Row[] = suppressed.map((email, index) => ({ id: `s-${index}`, email }));
  const rowsOf = (collection: string): Row[] =>
    collection === 'email-suppressions' ? suppressions : mails;
  const sendEmail = jest.fn().mockResolvedValue({ accepted: [] });

  const payload = {
    logger: { info: jest.fn(), error: jest.fn() },
    sendEmail,
    create: ({ collection, data }: { collection: string; data: Record<string, unknown> }) => {
      const rows = rowsOf(collection);
      const row = { id: `${collection}-${rows.length + 1}`, ...data };
      rows.push(row);
      return Promise.resolve(row);
    },
    findByID: ({ collection, id }: { collection: string; id: string }) => {
      const row = rowsOf(collection).find((candidate) => candidate.id === id);
      return row === undefined
        ? Promise.reject(Object.assign(new Error('Not Found'), { status: 404 }))
        : Promise.resolve(row);
    },
    update: ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      Object.assign(mails.find((candidate) => candidate.id === id) ?? {}, data);
      return Promise.resolve({});
    },
    find: ({ where }: { where: { email: { in: string[] } } }) =>
      Promise.resolve({
        docs: suppressions.filter((row) => where.email.in.includes(row['email'] as string)),
      }),
    count: ({ where }: { where: { email: { equals: string } } }) =>
      Promise.resolve({
        totalDocs: suppressions.filter((row) => row['email'] === where.email.equals).length,
      }),
  } as unknown as Payload;

  return { payload, mails, suppressions, sendEmail };
};

/** Sends one mail and reads the notification that comes back for one of its recipients. */
const bounceFrom = async (
  to: string,
  bounce: { email: string; action: string; status: string },
): Promise<World> => {
  const state = world();
  const { outgoingEmailId } = await sendTrackedEmail(state.payload, { to, subject: 'Rechnung' });
  await updateTrackingRecords(
    state.payload,
    outgoingEmailId,
    false,
    `Action: ${bounce.action}`,
    'raw email',
    bounce.email,
    bounce,
  );
  return state;
};

describe('suppressing addresses that bounced', () => {
  it('suppresses an address whose mailbox does not exist', async () => {
    const { suppressions, mails } = await bounceFrom('Gone@example.com', {
      email: 'gone@example.com',
      action: 'failed',
      status: '5.1.1',
    });

    expect(suppressions).toEqual([
      expect.objectContaining({
        email: 'gone@example.com',
        status: '5.1.1',
        outgoingEmail: mails[0]?.id,
      }),
    ]);
  });

  it.each([
    ['a full mailbox', 'failed', '5.2.2'],
    ['a policy rejection', 'failed', '5.7.1'],
    ['a delay', 'delayed', '4.4.1'],
  ])('keeps writing to an address after %s', async (_, action, status) => {
    const { suppressions } = await bounceFrom('full@example.com', {
      email: 'full@example.com',
      action,
      status,
    });

    expect(suppressions).toEqual([]);
  });

  it('does not suppress an address the mail was not sent to', async () => {
    // A recipient that forwards its mail bounces from the address it forwards to.
    const { suppressions } = await bounceFrom('avp@example.com', {
      email: 'forwarded@example.org',
      action: 'failed',
      status: '5.1.1',
    });

    expect(suppressions).toEqual([]);
  });

  it('lists an address once however often it bounces', async () => {
    const state = await bounceFrom('gone@example.com', {
      email: 'gone@example.com',
      action: 'failed',
      status: '5.1.1',
    });
    const bounce = { email: 'gone@example.com', action: 'failed', status: '5.1.1' };
    await updateTrackingRecords(
      state.payload,
      String(state.mails[0]?.id),
      false,
      'Action: failed',
      'raw email',
      bounce.email,
      bounce,
    );

    expect(state.suppressions).toHaveLength(1);
  });

  it('withholds a mail to a suppressed address and says why on its row', async () => {
    const { payload, mails, sendEmail } = world(['gone@example.com']);

    const result = await sendTrackedEmail(payload, { to: 'Gone@example.com', subject: 'Rechnung' });

    expect(sendEmail).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.error).toContain('gone@example.com bounced before');
    expect(mails[0]).toEqual(
      expect.objectContaining({
        deliveryStatus: 'error',
        smtpResults: [expect.objectContaining({ success: false, error: result.error })],
      }),
    );
  });

  it('still sends to the other recipients of a mail', async () => {
    const { payload, mails, sendEmail } = world(['gone@example.com']);

    const result = await sendTrackedEmail(payload, {
      to: 'gone@example.com, avp@example.com',
      subject: 'Erinnerung',
    });

    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: ['avp@example.com'] }));
    expect(result.success).toBe(true);
    expect(mails[0]?.['smtpResults']).toEqual([
      expect.objectContaining({ success: false, to: 'gone@example.com' }),
      expect.objectContaining({ success: true, to: 'avp@example.com' }),
    ]);
  });

  it('sends a mail unchanged when no recipient is suppressed', async () => {
    const { payload, sendEmail } = world(['gone@example.com']);

    await sendTrackedEmail(payload, { to: 'avp@example.com', subject: 'Erinnerung' });

    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'avp@example.com' }));
  });
});
