/* eslint-disable unicorn/no-null */
jest.mock('@/config/environment-variables', () => ({
  environmentVariables: { SMTP_USER: 'noreply@cevi.tools' },
}));

// Sorted sets only: member to score, per key.
const mockRedisStore = new Map<string, Map<string, number>>();
const mockRedisFailure: { error?: Error } = {};
const mockRedisCall = <T>(run: () => T): Promise<T> =>
  mockRedisFailure.error === undefined
    ? Promise.resolve(run())
    : Promise.reject(mockRedisFailure.error);
jest.mock('@/lib/db/redis', () => ({
  redis: {
    exists: (key: string): Promise<number> =>
      mockRedisCall(() => (mockRedisStore.has(key) ? 1 : 0)),
    zadd: (key: string, score: number, member: string): Promise<unknown> =>
      mockRedisCall(() => {
        const set = mockRedisStore.get(key) ?? new Map<string, number>();
        mockRedisStore.set(key, set.set(member, score));
      }),
    zrem: (key: string, member: string): Promise<unknown> =>
      mockRedisCall(() => mockRedisStore.get(key)?.delete(member)),
    zscore: (key: string, member: string): Promise<string | null> =>
      mockRedisCall(() => {
        const score = mockRedisStore.get(key)?.get(member);
        return score === undefined ? null : String(score);
      }),
    zrange: (key: string): Promise<string[]> =>
      mockRedisCall(() =>
        [...(mockRedisStore.get(key) ?? [])].flatMap(([member, score]) => [member, String(score)]),
      ),
    expire: (): Promise<unknown> => mockRedisCall(() => 1),
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
    update: ({
      collection,
      id,
      data,
    }: {
      collection: string;
      id: string;
      data: Record<string, unknown>;
    }) => {
      Object.assign(rowsOf(collection).find((candidate) => candidate.id === id) ?? {}, data);
      return Promise.resolve({});
    },
    find: ({ where }: { where: { email: { in?: string[]; equals?: string } } }) =>
      Promise.resolve({
        docs: suppressions.filter((row) =>
          (where.email.in ?? [where.email.equals]).includes(row['email'] as string),
        ),
      }),
    delete: ({ id }: { id: string }) => {
      suppressions.splice(
        suppressions.findIndex((row) => row.id === id),
        1,
      );
      return Promise.resolve({});
    },
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
    [bounce],
  );
  return state;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const START = Date.parse('2027-03-01T08:00:00Z');

/** Sends a mail to one address on a given day, without any report coming back yet. */
const sendOnDay = async (state: World, day: number, to = 'avp@example.com'): Promise<string> => {
  jest.setSystemTime(START + day * DAY_MS);
  const { outgoingEmailId } = await sendTrackedEmail(state.payload, { to, subject: 'Erinnerung' });
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
    [{ email: to, ...report }],
  );
};

/** Sends a mail on a given day and reads one report about it right away. */
const mailOnDay = async (
  state: World,
  day: number,
  report: { action: string; status: string },
): Promise<string> => {
  const outgoingEmailId = await sendOnDay(state, day);
  await reportOn(state, outgoingEmailId, report);
  return outgoingEmailId;
};

// What Microsoft 365 answers for a recipient it does not know, and for a broken tenant.
const unreachable = { action: 'failed', status: '5.4.1' };
const relayed = { action: 'relayed', status: '2.0.0' };

beforeEach(() => {
  jest.useFakeTimers({ now: START });
  mockRedisStore.clear();
  delete mockRedisFailure.error;
});
afterEach(() => {
  jest.useRealTimers();
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

  it('goes by when the mails were sent, not by when their reports are read', async () => {
    // Two mails a day apart, whose bounces are read weeks apart.
    const state = world();
    const first = await sendOnDay(state, 0);
    const second = await sendOnDay(state, 1);
    await reportOn(state, first, unreachable);
    jest.setSystemTime(START + 30 * DAY_MS);
    await reportOn(state, second, unreachable);

    expect(state.suppressions).toEqual([]);
  });

  it('starts over when a mail gets through in between', async () => {
    const state = world();
    await mailOnDay(state, 0, unreachable);
    await mailOnDay(state, 7, relayed);
    await mailOnDay(state, 14, unreachable);

    expect(state.suppressions).toEqual([]);
  });

  it('does not take the hand-off report of a bounced mail for a delivery', async () => {
    // The relay confirms it passed the mail on, and the next server bounces it afterwards.
    const state = world();
    const first = await mailOnDay(state, 0, unreachable);
    await reportOn(state, first, relayed);
    const second = await mailOnDay(state, 7, unreachable);
    await reportOn(state, first, relayed);
    await reportOn(state, second, relayed);
    await mailOnDay(state, 14, unreachable);

    expect(state.suppressions).toHaveLength(1);
  });

  it('does not take the hand-off report for a delivery when it is read before the bounce', async () => {
    const state = world();
    await mailOnDay(state, 0, unreachable);
    const second = await mailOnDay(state, 14, relayed);
    await reportOn(state, second, unreachable);

    expect(state.suppressions).toHaveLength(1);
  });

  it('does not let a mail from before the bounces count as getting through', async () => {
    const state = world();
    const earlier = await sendOnDay(state, 0);
    await mailOnDay(state, 1, unreachable);
    await reportOn(state, earlier, relayed);
    await mailOnDay(state, 15, unreachable);

    expect(state.suppressions).toHaveLength(1);
  });

  it('lifts the suppression when a delivery in between is only read afterwards', async () => {
    // The bounce job was down for a day and reads the newest notification first.
    const state = world();
    await mailOnDay(state, 0, unreachable);
    const delivered = await sendOnDay(state, 13);
    await mailOnDay(state, 14, unreachable);
    expect(state.suppressions).toHaveLength(1);

    await reportOn(state, delivered, relayed);

    expect(state.suppressions).toEqual([]);
  });

  it('keeps an address whose mailbox does not exist suppressed whatever is read later', async () => {
    const state = world();
    await mailOnDay(state, 0, unreachable);
    const delivered = await sendOnDay(state, 5);
    await mailOnDay(state, 6, { action: 'failed', status: '5.1.1' });

    await reportOn(state, delivered, relayed);

    expect(state.suppressions).toHaveLength(1);
  });

  it('keeps an address suppressed once its mailbox turns out not to exist', async () => {
    // Suppressed for repeated bounces first, then a late delivery from in between is read.
    const state = world();
    await mailOnDay(state, 0, unreachable);
    const delivered = await sendOnDay(state, 13);
    const second = await mailOnDay(state, 14, unreachable);
    await reportOn(state, second, { action: 'failed', status: '5.1.1' });

    await reportOn(state, delivered, relayed);

    expect(state.suppressions).toEqual([expect.objectContaining({ status: '5.1.1' })]);
  });

  it('counts a resend that bounces again as a second bounce', async () => {
    const state = world();
    const mail = await mailOnDay(state, 0, unreachable);
    jest.setSystemTime(START + 14 * DAY_MS);
    await state.payload.update({
      collection: 'outgoing-emails',
      id: mail,
      data: { smtpReceivedAt: new Date().toISOString() },
    });
    await reportOn(state, mail, unreachable);

    expect(state.suppressions).toHaveLength(1);
  });

  it('counts a resend that gets through as a delivery', async () => {
    const state = world();
    const mail = await mailOnDay(state, 0, unreachable);
    jest.setSystemTime(START + 7 * DAY_MS);
    await state.payload.update({
      collection: 'outgoing-emails',
      id: mail,
      data: { smtpReceivedAt: new Date().toISOString() },
    });
    await reportOn(state, mail, relayed);
    await mailOnDay(state, 14, unreachable);

    expect(state.suppressions).toEqual([]);
  });

  it('suppresses on the next reading when the list could not be written the first time', async () => {
    const state = world();
    await mailOnDay(state, 0, unreachable);
    const second = await sendOnDay(state, 14);
    const create = (state.payload as unknown as { create: unknown }).create;
    (state.payload as unknown as { create: unknown }).create = (): Promise<never> =>
      Promise.reject(new Error('connection timed out'));
    await expect(reportOn(state, second, unreachable)).rejects.toThrow('connection timed out');

    (state.payload as unknown as { create: unknown }).create = create;
    await reportOn(state, second, unreachable);

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
      [bounce],
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
    (state.payload as unknown as { find: unknown }).find = (): Promise<never> =>
      Promise.reject(new Error('connection timed out'));
    const bounce = { email: 'gone@example.com', action: 'failed', status: '5.1.1' };

    await expect(
      updateTrackingRecords(state.payload, outgoingEmailId, false, 'Action: failed', 'raw email', [
        bounce,
      ]),
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
