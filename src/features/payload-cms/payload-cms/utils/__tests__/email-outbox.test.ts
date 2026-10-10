/* eslint-disable unicorn/no-null */
const mockS3Send = jest.fn();
jest.mock('@/lib/s3', () => ({
  MAIL_ATTACHMENT_BUCKET_NAME: 'mail-attachments',
  s3Client: { send: (command: unknown): unknown => mockS3Send(command) },
}));
jest.mock('@aws-sdk/client-s3', () => ({
  PutObjectCommand: class {
    readonly kind = 'put';
    constructor(readonly input: { Key: string }) {}
  },
  GetObjectCommand: class {
    readonly kind = 'get';
    constructor(readonly input: { Key: string }) {}
  },
  DeleteObjectCommand: class {
    readonly kind = 'delete';
    constructor(readonly input: { Key: string }) {}
  },
}));
const mockRedis = { set: jest.fn(), eval: jest.fn() };
jest.mock('@/lib/db/redis', () => ({
  redis: {
    set: (...arguments_: unknown[]): unknown => mockRedis.set(...arguments_),
    eval: (...arguments_: unknown[]): unknown => mockRedis.eval(...arguments_),
  },
}));
const mockReserve = jest.fn();
jest.mock('@/lib/background-email-budget', () => ({
  reserveBackgroundEmail: (): unknown => mockReserve(),
}));
const mockSendTrackedEmail = jest.fn();
jest.mock('@/features/payload-cms/payload-cms/utils/send-tracked-email', () => ({
  sendTrackedEmail: (...arguments_: unknown[]): unknown => mockSendTrackedEmail(...arguments_),
}));

import {
  discardQueuedEmailsFor,
  drainEmailOutbox,
  queueBackgroundEmail,
} from '@/features/payload-cms/payload-cms/utils/email-outbox';
import type { Payload } from 'payload';

type Row = Record<string, unknown> & { id: string };

/** The `outgoing-emails` collection, reduced to the queries the outbox makes. */
const payloadDouble = (rows: Row[] = []): { payload: Payload; rows: Row[] } => {
  const payload = {
    logger: { warn: jest.fn(), error: jest.fn() },
    create: ({ data }: { data: Record<string, unknown> }) => {
      const row = { id: `mail-${String(rows.length + 1)}`, ...data };
      rows.push(row);
      return Promise.resolve(row);
    },
    update: ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const row = rows.find((candidate) => candidate.id === id);
      Object.assign(row ?? {}, data);
      return Promise.resolve(row);
    },
    find: ({
      where,
      limit,
    }: {
      where: { and: Record<string, { equals?: unknown; exists?: boolean }>[] };
      limit: number;
    }) => {
      const matching = rows.filter((row) =>
        where.and.every((condition) =>
          Object.entries(condition).every(([field, rule]) =>
            rule.exists === undefined
              ? row[field] === rule.equals
              : (row[field] !== undefined) === rule.exists,
          ),
        ),
      );
      return Promise.resolve({ docs: matching.slice(0, limit) });
    },
  } as unknown as Payload;
  return { payload, rows };
};

const queuedRow = (id: string, overrides: Record<string, unknown> = {}): Row => ({
  id,
  to: `${id}@example.com`,
  subject: 'Subject',
  text: 'Body',
  deliveryStatus: 'queued',
  queuedAttachments: [],
  ...overrides,
});

const s3Calls = (kind: string): string[] =>
  (mockS3Send.mock.calls as [{ kind: string; input: { Key: string } }][])
    .filter(([command]) => command.kind === kind)
    .map(([command]) => command.input.Key);

beforeEach(() => {
  jest.clearAllMocks();
  mockRedis.set.mockResolvedValue('OK');
  mockReserve.mockResolvedValue(true);
  mockS3Send.mockImplementation((command: { kind: string }) =>
    Promise.resolve(
      command.kind === 'get'
        ? {
            Body: {
              transformToByteArray: (): Promise<Uint8Array> =>
                Promise.resolve(new Uint8Array([1, 2])),
            },
          }
        : {},
    ),
  );
  // The real one writes the outcome onto the row it was given.
  mockSendTrackedEmail.mockResolvedValue({ success: true, outgoingEmailId: 'x' });
});

describe('queueBackgroundEmail', () => {
  it('stores the mail as queued with its attachments set aside, and sends nothing', async () => {
    const { payload, rows } = payloadDouble();

    const result = await queueBackgroundEmail(
      payload,
      {
        to: ['av@ceviuster.ch', 'stv@ceviuster.ch'],
        subject: 'Rechnung',
        text: 'Hallo',
        attachments: [{ filename: 'rechnung.pdf', content: Buffer.from('pdf') }],
      },
      'participant-1',
    );

    expect(result).toEqual({ success: true, outgoingEmailId: 'mail-1' });
    expect(mockSendTrackedEmail).not.toHaveBeenCalled();
    expect(rows[0]).toMatchObject({
      deliveryStatus: 'queued',
      to: 'av@ceviuster.ch, stv@ceviuster.ch',
      billParticipant: 'participant-1',
    });
    const [stored] = rows[0]?.['queuedAttachments'] as { filename: string; key: string }[];
    expect(stored?.filename).toBe('rechnung.pdf');
    expect(s3Calls('put')).toEqual([stored?.key]);
  });

  it('does not leave an attachment behind when the mail could not be stored', async () => {
    const { payload } = payloadDouble();
    (payload as unknown as { create: jest.Mock }).create = jest
      .fn()
      .mockRejectedValue(new Error('mongo down'));

    await expect(
      queueBackgroundEmail(payload, {
        to: 'a@example.com',
        subject: 's',
        attachments: [{ filename: 'a.pdf', content: Buffer.from('pdf') }],
      }),
    ).rejects.toThrow('mongo down');

    expect(s3Calls('delete')).toEqual(s3Calls('put'));
  });
});

describe('drainEmailOutbox', () => {
  it('sends until the hourly budget is used up and leaves the rest queued', async () => {
    const { payload, rows } = payloadDouble([queuedRow('a'), queuedRow('b'), queuedRow('c')]);
    mockReserve.mockResolvedValueOnce(true).mockResolvedValueOnce(true).mockResolvedValue(false);

    const summary = await drainEmailOutbox(payload, 50);

    expect(summary).toMatchObject({ sent: 2, failed: 0, budgetExhausted: true });
    expect(mockSendTrackedEmail).toHaveBeenCalledTimes(2);
    expect(rows.map((row) => row['deliveryStatus'])).toEqual(['pending', 'pending', 'queued']);
  });

  it('sends the mail with the attachments it was queued with, then deletes them', async () => {
    const attachment = { filename: 'rechnung.pdf', key: 'folder/rechnung.pdf' };
    const { payload, rows } = payloadDouble([queuedRow('a', { queuedAttachments: [attachment] })]);

    await drainEmailOutbox(payload, 50);

    const call = mockSendTrackedEmail.mock.calls[0] as unknown[];
    const mail = call[1] as { to: string; attachments: { filename: string }[] };
    const existingId = call[4];
    expect(mail.to).toBe('a@example.com');
    expect(mail.attachments[0]?.filename).toBe('rechnung.pdf');
    // Sent on the row that was queued, so the list shows one mail, not two.
    expect(existingId).toBe('a');
    expect(s3Calls('delete')).toEqual(['folder/rechnung.pdf']);
    expect(rows[0]?.['queuedAttachments']).toEqual([]);
  });

  it('keeps the attachments of a mail the server refused, so it can be resent', async () => {
    const attachment = { filename: 'rechnung.pdf', key: 'folder/rechnung.pdf' };
    const { payload, rows } = payloadDouble([queuedRow('a', { queuedAttachments: [attachment] })]);
    mockSendTrackedEmail.mockResolvedValue({ success: false, outgoingEmailId: 'a', error: 'no' });

    const summary = await drainEmailOutbox(payload, 50);

    expect(summary).toMatchObject({ sent: 0, failed: 1 });
    expect(s3Calls('delete')).toEqual([]);
    expect(rows[0]?.['queuedAttachments']).toEqual([attachment]);
    // Never back to `queued`: the next run must not send it a second time.
    expect(rows[0]?.['deliveryStatus']).not.toBe('queued');
  });

  it('lets reminders and reports out before the bills', async () => {
    const { payload } = payloadDouble([
      queuedRow('bill-1', { billParticipant: 'p1' }),
      queuedRow('bill-2', { billParticipant: 'p2' }),
      queuedRow('report'),
    ]);
    mockReserve.mockResolvedValueOnce(true).mockResolvedValue(false);

    await drainEmailOutbox(payload, 50);

    const [, mail] = mockSendTrackedEmail.mock.calls[0] as [unknown, { to: string }];
    expect(mail.to).toBe('report@example.com');
  });

  it('discards a mail that is no longer wanted, without spending budget on it', async () => {
    const { payload, rows } = payloadDouble([queuedRow('old'), queuedRow('current')]);

    const summary = await drainEmailOutbox(payload, 50, {
      staleReason: (email) =>
        Promise.resolve(email.id === 'old' ? 'the registration is now "removed"' : undefined),
    });

    expect(summary).toMatchObject({ sent: 1, discarded: 1 });
    expect(mockReserve).toHaveBeenCalledTimes(1);
    expect(rows[0]?.['deliveryStatus']).toBe('error');
    expect(JSON.stringify(rows[0]?.['smtpResults'])).toContain('removed');
  });

  it('does nothing while the other replica is draining', async () => {
    const { payload, rows } = payloadDouble([queuedRow('a')]);
    mockRedis.set.mockResolvedValue(null);

    const summary = await drainEmailOutbox(payload, 50);

    expect(summary).toMatchObject({ sent: 0, duplicate: true });
    expect(mockSendTrackedEmail).not.toHaveBeenCalled();
    expect(rows[0]?.['deliveryStatus']).toBe('queued');
  });
});

describe('discardQueuedEmailsFor', () => {
  it('takes the queued mails of one registration out of the queue and leaves the others', async () => {
    const { payload, rows } = payloadDouble([
      queuedRow('a', { billParticipant: 'p1' }),
      queuedRow('b', { billParticipant: 'p2' }),
      queuedRow('c', { billParticipant: 'p1', deliveryStatus: 'success' }),
    ]);

    await discardQueuedEmailsFor(payload, 'p1', 'replaced');

    expect(rows.map((row) => row['deliveryStatus'])).toEqual(['error', 'queued', 'success']);
  });
});
