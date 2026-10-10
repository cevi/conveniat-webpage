/* eslint-disable unicorn/no-null */
jest.mock('@/config/environment-variables', () => ({
  environmentVariables: { SMTP_USER: 'noreply@cevi.tools' },
}));

const mockRedisStore = new Map<string, string>();
const mockRedisFailure: { error?: Error } = {};
const mockRedisCall = <T>(run: () => T): Promise<T> =>
  mockRedisFailure.error === undefined
    ? Promise.resolve(run())
    : Promise.reject(mockRedisFailure.error);
jest.mock('@/lib/db/redis', () => ({
  redis: {
    get: (key: string): Promise<string | null> =>
      mockRedisCall(() => mockRedisStore.get(key) ?? null),
    set: (key: string, value: string): Promise<unknown> =>
      mockRedisCall(() => mockRedisStore.set(key, value)),
    del: (key: string): Promise<unknown> => mockRedisCall(() => mockRedisStore.delete(key)),
  },
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
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
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

const DAY_MS = 24 * 60 * 60 * 1000;
const START = Date.parse('2027-03-01T08:00:00Z');

/** Sends a mail to one address on a given day and reads one report about it. */
const mailOnDay = async (
  state: World,
  day: number,
  report: { action: string; status: string },
  to = 'avp@example.com',
): Promise<string> => {
  jest.spyOn(Date, 'now').mockReturnValue(START + day * DAY_MS);
  const { outgoingEmailId } = await sendTrackedEmail(state.payload, { to, subject: 'Erinnerung' });
  await reportOn(state, outgoingEmailId, report, to);
  return outgoingEmailId;
};

const reportOn = async (
  state: World,
  outgoingEmailId: string,
  report: { action: string; status: string },
  to = 'avp@example.com',
): Promise<void> => {
  await updateTrackingRecords(
    state.payload,
    outgoingEmailId,
    report.action !== 'failed',
    `Action: ${report.action}`,
    'raw email',
    to,
    report,
  );
};

// What Microsoft 365 answers for a recipient it does not know, and for a broken tenant.
const unreachable = { action: 'failed', status: '5.4.1' };
const relayed = { action: 'relayed', status: '2.0.0' };

beforeEach(() => {
  mockRedisStore.clear();
  delete mockRedisFailure.error;
});
afterEach(() => {
  jest.restoreAllMocks();
});

describe('suppressing addresses that keep bouncing', () => {
  it('keeps writing to an address that could not be reached once', async () => {
    const state = world();
    await mailOnDay(state, 0, unreachable);

    expect(state.suppressions).toEqual([]);
  });

  it('suppresses an address that still cannot be reached two weeks later', async () => {
    const state = world();
    await mailOnDay(state, 0, unreachable);
    const second = await mailOnDay(state, 14, unreachable);

    expect(state.suppressions).toEqual([
      expect.objectContaining({ email: 'avp@example.com', status: '5.4.1', outgoingEmail: second }),
    ]);
  });

  it.each([
    ['a full mailbox', '5.2.2'],
    ['a domain that does not resolve', '5.4.4'],
    ['a mail given up on after days of retries', '4.4.1'],
  ])('counts %s the same way', async (_, status) => {
    const state = world();
    await mailOnDay(state, 0, { action: 'failed', status });
    await mailOnDay(state, 20, { action: 'failed', status });

    expect(state.suppressions).toHaveLength(1);
  });

  it('does not suppress on bounces that are only days apart', async () => {
    // A provider that is down for a week bounces everything sent to it in that week.
    const state = world();
    await mailOnDay(state, 0, unreachable);
    await mailOnDay(state, 3, unreachable);
    await mailOnDay(state, 7, unreachable);

    expect(state.suppressions).toEqual([]);
  });

  it('starts over when a mail gets through in between', async () => {
    const state = world();
    await mailOnDay(state, 0, unreachable);
    await mailOnDay(state, 7, relayed);
    await mailOnDay(state, 14, unreachable);

    expect(state.suppressions).toEqual([]);
  });

  it('does not take the hand-off report of the bounced mail for a delivery', async () => {
    // The relay confirms it passed the mail on, and the next server bounces it afterwards.
    const state = world();
    const first = await mailOnDay(state, 0, unreachable);
    await reportOn(state, first, relayed);
    await mailOnDay(state, 14, unreachable);

    expect(state.suppressions).toHaveLength(1);
  });

  it('never suppresses on rejections that are about the sender', async () => {
    const state = world();
    await mailOnDay(state, 0, { action: 'failed', status: '5.7.1' });
    await mailOnDay(state, 20, { action: 'failed', status: '5.7.1' });
    await mailOnDay(state, 40, { action: 'failed', status: '5.0.0' });

    expect(state.suppressions).toEqual([]);
  });

  it('still records the bounce on the mail when the count cannot be kept', async () => {
    const state = world();
    mockRedisFailure.error = new Error('connect ECONNREFUSED');

    await mailOnDay(state, 0, unreachable);

    expect(state.suppressions).toEqual([]);
    expect(state.mails[0]).toEqual(expect.objectContaining({ deliveryStatus: 'error' }));
  });
});

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
    ['a failed SPF check', 'failed', '5.0.0'],
    ['a domain that does not resolve', 'failed', '5.4.4'],
    ['a delay', 'delayed', '4.4.1'],
  ])('keeps writing to an address after %s', async (_, action, status) => {
    const { suppressions } = await bounceFrom('full@example.com', {
      email: 'full@example.com',
      action,
      status,
    });

    expect(suppressions).toEqual([]);
  });

  it('keeps a mailing list reachable when the mailbox of one member is gone', async () => {
    // What comes back from a Cevi.DB group or a forwarding address names the member.
    const { payload, suppressions, sendEmail } = await bounceFrom('hof-uster@lists.example.com', {
      email: 'member@example.org',
      action: 'failed',
      status: '5.1.1',
    });

    expect(suppressions).toEqual([]);

    sendEmail.mockClear();
    await sendTrackedEmail(payload, { to: 'hof-uster@lists.example.com', subject: 'Erinnerung' });
    expect(sendEmail).toHaveBeenCalledTimes(1);
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

  it('suppresses an address with an apostrophe as it is written', async () => {
    const { suppressions } = await bounceFrom("o'neill@example.com", {
      email: "o'neill@example.com",
      action: 'failed',
      status: '5.1.1',
    });

    expect(suppressions).toEqual([expect.objectContaining({ email: "o'neill@example.com" })]);
  });

  it('leaves the notification to be read again when the list cannot be written', async () => {
    const state = world();
    const { outgoingEmailId } = await sendTrackedEmail(state.payload, {
      to: 'gone@example.com',
      subject: 'Rechnung',
    });
    (state.payload as unknown as { count: unknown }).count = (): Promise<never> =>
      Promise.reject(new Error('connection timed out'));
    const bounce = { email: 'gone@example.com', action: 'failed', status: '5.1.1' };

    await expect(
      updateTrackingRecords(
        state.payload,
        outgoingEmailId,
        false,
        'Action: failed',
        'raw email',
        bounce.email,
        bounce,
      ),
    ).rejects.toThrow('connection timed out');
    // Nothing was recorded yet, so reading it again does not record the bounce twice.
    expect(state.mails[0]?.['smtpResults']).toHaveLength(1);
  });

  it('does not send a mail whose recipients could not be checked, and says so on its row', async () => {
    const { payload, mails, sendEmail } = world();
    (payload as unknown as { find: unknown }).find = (): Promise<never> =>
      Promise.reject(new Error('connection timed out'));

    const result = await sendTrackedEmail(payload, { to: 'avp@example.com', subject: 'Rechnung' });

    expect(sendEmail).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({ success: false, error: 'connection timed out' }),
    );
    expect(mails[0]?.['deliveryStatus']).toBe('error');
  });

  it('sends a mail unchanged when no recipient is suppressed', async () => {
    const { payload, sendEmail } = world(['gone@example.com']);

    await sendTrackedEmail(payload, { to: 'avp@example.com', subject: 'Erinnerung' });

    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'avp@example.com' }));
  });
});
