jest.mock('@/config/environment-variables', () => ({
  environmentVariables: {
    SMTP_HOST: 'mail.example.net',
    SMTP_USER: 'noreply@cevi.tools',
    SMTP_PASS: 'secret',
  },
}));
jest.mock('@/lib/db/redis', () => ({
  redis: { get: jest.fn().mockResolvedValue('0'), set: jest.fn().mockResolvedValue('OK') },
}));
jest.mock('payload', () => ({ countRunnableOrActiveJobsForQueue: jest.fn() }));
jest.mock('@/features/payload-cms/payload-cms/tasks/cleanup-stale-jobs', () => ({
  MAIL_QUEUE: 'mail',
  cleanupCompletedScheduledJobs: jest.fn(),
  cleanupStaleScheduledJobs: jest.fn(),
  recoverStaleJobs: jest.fn(),
}));

const mockMailbox: string[] = [];
const mockDeleted: number[] = [];
jest.mock(
  'node-pop3',
  () =>
    class {
      UIDL = (): Promise<string[][]> =>
        Promise.resolve(mockMailbox.map((_, index) => [String(index + 1), `uid-${index + 1}`]));
      RETR = (id: number): Promise<string> => Promise.resolve(mockMailbox[id - 1] ?? '');
      DELE = (id: number): Promise<void> => {
        mockDeleted.push(id);
        return Promise.resolve();
      };
      QUIT = (): Promise<void> => Promise.resolve();
    },
);

import { fetchSmtpBouncesTask } from '@/features/payload-cms/payload-cms/tasks/fetch-smtp-bounces';
import type { PayloadRequest } from 'payload';

type Row = Record<string, unknown> & { id: string };

const notFound = (): Error => Object.assign(new Error('Not Found'), { status: 404 });

/** A mail as it is stored once our server has taken it. */
const sentMail = (id: string, to: string, messageId: string, queueId: string): Row => ({
  id,
  to,
  createdAt: new Date().toISOString(),
  smtpResults: [
    {
      success: true,
      to,
      response: { messageId: `<${messageId}>`, response: `250 2.0.0 Ok: queued as ${queueId}` },
    },
  ],
});

/** A bounce from a server that does not pass the envelope id on. */
const bounceWithoutEnvelopeId = (recipient: string, quoted: string[]): string =>
  [
    'From: MAILER-DAEMON@mail.example.net',
    'To: noreply@cevi.tools',
    'Subject: Undelivered Mail Returned to Sender',
    'Message-ID: <20270301080000.1A2B3C@mail.example.net>',
    'Content-Type: text/plain',
    '',
    `Final-Recipient: rfc822; ${recipient}`,
    'Action: failed',
    'Status: 5.1.1',
    '',
    ...quoted,
    '',
  ].join('\r\n');

const run = async (mails: Row[]): Promise<{ suppressed: unknown[]; ignored: string[] }> => {
  const suppressions: Row[] = [];
  const tracking: Row[] = [];
  const rowsOf = (collection: string): Row[] => {
    if (collection === 'outgoing-emails') return mails;
    return collection === 'email-suppressions' ? suppressions : tracking;
  };

  const payload = {
    logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    find: ({ collection }: { collection: string }): Promise<{ docs: Row[] }> =>
      Promise.resolve({ docs: rowsOf(collection) }),
    findByID: ({ collection, id }: { collection: string; id: string }): Promise<Row> => {
      const row =
        collection === 'outgoing-emails' ? mails.find((mail) => mail.id === id) : undefined;
      return row === undefined ? Promise.reject(notFound()) : Promise.resolve(row);
    },
    create: ({
      collection,
      data,
    }: {
      collection: string;
      data: Record<string, unknown>;
    }): Promise<Row> => {
      const row = { id: `${collection}-${rowsOf(collection).length + 1}`, ...data };
      rowsOf(collection).push(row);
      return Promise.resolve(row);
    },
    update: (): Promise<unknown> => Promise.resolve({}),
    delete: (): Promise<unknown> => Promise.resolve({}),
  };

  const handler = fetchSmtpBouncesTask.handler as unknown as (arguments_: {
    req: PayloadRequest;
  }) => Promise<unknown>;
  await handler({ req: { payload } as unknown as PayloadRequest });

  return {
    suppressed: suppressions.map((row) => row['email']),
    ignored: tracking.map((row) => String(row['uid'])),
  };
};

beforeEach(() => {
  mockMailbox.length = 0;
  mockDeleted.length = 0;
});

describe('fetchSmtpBounces without an envelope id', () => {
  it('finds the mail by the Message-ID the bounce returns', async () => {
    mockMailbox.push(
      bounceWithoutEnvelopeId('gone@example.com', [
        'Message-ID: <4f0c2c1e-7a0b-4a51-9d0c-2f6f3f0a9b11@cevi.tools>',
      ]),
    );

    const { suppressed } = await run([
      sentMail(
        'mail-1',
        'gone@example.com',
        '4f0c2c1e-7a0b-4a51-9d0c-2f6f3f0a9b11@cevi.tools',
        'QUEUE0001',
      ),
    ]);

    expect(suppressed).toEqual(['gone@example.com']);
    expect(mockDeleted).toEqual([1]);
  });

  it('places no mail by its queue id or by the address of its recipient', async () => {
    // Both can be known or guessed by somebody who never got the mail.
    mockMailbox.push(
      bounceWithoutEnvelopeId('avp@example.com', [
        'X-Postfix-Queue-ID: QUEUE0001',
        '250 2.0.0 Ok: queued as QUEUE0001',
      ]),
      bounceWithoutEnvelopeId('avp@example.com', ['Message-ID: <avp@example.com>']),
    );

    const { suppressed, ignored } = await run([
      sentMail(
        'mail-1',
        'avp@example.com',
        '4f0c2c1e-7a0b-4a51-9d0c-2f6f3f0a9b11@cevi.tools',
        'QUEUE0001',
      ),
    ]);

    expect(suppressed).toEqual([]);
    // Left in the shared mailbox like any mail that is not ours, and not read again.
    expect(mockDeleted).toEqual([]);
    expect(ignored.toSorted()).toEqual(['uid-1', 'uid-2']);
  });
});
