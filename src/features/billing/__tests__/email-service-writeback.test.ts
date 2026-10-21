// The send path reaches Redis, S3 and the mail transport before it reaches the write-back
// this file is about, so those three are replaced wholesale.
jest.mock('@/features/billing/adapters/redis-run-lock.adapter', () => ({
  RedisRunLockAdapter: class {
    acquire(): unknown {
      return { acquired: true, lock: { release: (): Promise<void> => Promise.resolve() } };
    }
  },
}));
jest.mock('@/config/environment-variables', () => ({
  environmentVariables: { S3_HOST: '', S3_ACCESS_KEY_ID: '', S3_SECRET_ACCESS_KEY: '' },
}));
jest.mock('@/lib/s3', () => ({ BILL_PDF_BUCKET_NAME: 'bills' }));
jest.mock('@aws-sdk/client-s3', () => ({
  GetObjectCommand: class {},
  S3Client: class {
    send(): Promise<unknown> {
      return Promise.resolve({
        Body: {
          transformToByteArray: (): Promise<Uint8Array> => Promise.resolve(new Uint8Array()),
        },
      });
    }
  },
}));
jest.mock('@/features/payload-cms/payload-cms/utils/send-tracked-email', () => ({
  sendTrackedEmail: jest.fn().mockResolvedValue({ success: true, outgoingEmailId: 'mail-1' }),
}));
jest.mock('@/features/payload-cms/payload-cms/utils/email-outbox', () => ({
  discardQueuedEmailsFor: jest.fn(),
  queueBackgroundEmail: jest.fn().mockResolvedValue({ success: true, outgoingEmailId: 'mail-2' }),
}));
const mockMarkBillMailNotQueued = jest.fn();
jest.mock('@/features/billing/services/bill-mail-status', () => ({
  ...jest.requireActual<object>('@/features/billing/services/bill-mail-status'),
  markBillMailNotQueued: (...args: unknown[]): unknown => mockMarkBillMailNotQueued(...args),
}));
jest.mock('@/lib/hitobito', () => ({
  HITOBITO_CONFIG: { baseUrl: 'http://mock', apiToken: 'mock' },
}));

import type { HitobitoServicePort } from '@/features/billing/ports/hitobito-service.port';
import { sendBills } from '@/features/billing/services/email-service';
import {
  discardQueuedEmailsFor,
  queueBackgroundEmail,
} from '@/features/payload-cms/payload-cms/utils/email-outbox';
import { sendTrackedEmail } from '@/features/payload-cms/payload-cms/utils/send-tracked-email';
import type { Payload } from 'payload';

const participantRow = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: 'doc-1',
  participationUuid: 'part-1',
  eventId: 'event-1',
  groupId: 'group-1',
  fullName: 'Max Mustermann',
  email: 'max@example.com',
  status: 'bill_created',
  invoiceNumber: '2027-0001',
  billPdfs: ['pdf-1'],
  anmeldestatus: 'erfasst durch AVP',
  syncHistory: [],
  ...overrides,
});

const payloadDouble = (
  row: Record<string, unknown>,
  browserCookie = 'cookie',
  billSettings: Record<string, unknown> = {},
): { payload: Payload; updates: Record<string, unknown>[] } => {
  const updates: Record<string, unknown>[] = [];
  const payload = {
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
    findGlobal: ({ slug }: { slug: string }) =>
      Promise.resolve(slug === 'registration-management' ? { browserCookie } : billSettings),
    find: () => Promise.resolve({ docs: [row] }),
    findByID: () => Promise.resolve({ filename: 'bill.pdf' }),
    update: ({ data }: { data: Record<string, unknown> }) => {
      updates.push(data);
      return Promise.resolve(row);
    },
  } as unknown as Payload;

  return { payload, updates };
};

const hitobitoDouble = (updateParticipationAnswer: jest.Mock): HitobitoServicePort =>
  ({ updateParticipationAnswer }) as unknown as HitobitoServicePort;

describe('sendBills writes the Anmeldestatus back to the Cevi.DB', () => {
  it('sets it once the bill has left, and records the value on the row', async () => {
    const { payload, updates } = payloadDouble(participantRow());
    const update = jest.fn().mockResolvedValue({ changed: true, previous: 'erfasst durch AVP' });

    const summary = await sendBills(payload, undefined, {
      hitobitoService: hitobitoDouble(update),
    });

    expect(summary.queuedCount).toBe(1);
    expect(update).toHaveBeenCalledWith(
      'group-1',
      'event-1',
      'part-1',
      ['anmeldestatus'],
      'Rechnung gestellt',
      ['definitiv'],
    );
    expect(updates).toHaveLength(1);
    expect(updates[0]?.['status']).toBe('bill_mail_pending');
    expect(updates[0]?.['anmeldestatus']).toBe('Rechnung gestellt');
    expect(summary.errors).toHaveLength(0);
  });

  it('tells the Cevi.DB before the mail can leave, so a failed mail finds what to put back', async () => {
    const { payload, updates } = payloadDouble(participantRow());
    const update = jest.fn().mockResolvedValue({ changed: true, previous: 'erfasst durch AVP' });
    (queueBackgroundEmail as jest.Mock).mockClear();

    await sendBills(payload, undefined, { hitobitoService: hitobitoDouble(update) });

    const [writtenAt] = update.mock.invocationCallOrder;
    const [queuedAt] = (queueBackgroundEmail as jest.Mock).mock.invocationCallOrder;
    expect(writtenAt).toBeLessThan(queuedAt ?? 0);
    const history = updates[0]?.['syncHistory'] as { action: string; previous?: string }[];
    expect(history.at(-1)).toMatchObject({
      action: 'anmeldestatus_written_to_cevidb',
      previous: 'erfasst durch AVP',
    });
  });

  it('never touches a registration that is already definitiv', async () => {
    const { payload, updates } = payloadDouble(participantRow({ anmeldestatus: 'definitiv' }));
    const update = jest.fn();

    const summary = await sendBills(payload, undefined, {
      hitobitoService: hitobitoDouble(update),
    });

    expect(update).not.toHaveBeenCalled();
    expect(summary.queuedCount).toBe(1);
    expect(updates).toHaveLength(1);
  });

  it('still counts the bill as sent when the write-back fails', async () => {
    const { payload, updates } = payloadDouble(participantRow());
    const update = jest.fn().mockRejectedValue(new Error('Status 500'));

    const summary = await sendBills(payload, undefined, {
      hitobitoService: hitobitoDouble(update),
    });

    expect(summary.queuedCount).toBe(1);
    expect(summary.failedCount).toBe(0);
    expect(summary.errors[0]).toContain('Max Mustermann');
    expect(updates[0]?.['status']).toBe('bill_mail_pending');
    const history = updates[0]?.['syncHistory'] as { action: string }[];
    expect(history.at(-1)?.action).toBe('anmeldestatus_writeback_failed');
    // The failed write-back must not invent a value on the row.
    expect(updates[0]?.['anmeldestatus']).toBe('erfasst durch AVP');
  });

  it('links the operator to the Cevi.DB session settings when no cookie is configured', async () => {
    const { payload } = payloadDouble(participantRow(), '');

    const summary = await sendBills(payload);

    expect(summary.queuedCount).toBe(1);
    expect(summary.relatedDocuments).toEqual(['registrationManagement']);
    expect(summary.errors[0]).toContain('«Cevi.DB-Sitzung»');
  });
});

describe('sendBills hands a bulk run to the outgoing mail queue', () => {
  beforeEach(() => {
    (sendTrackedEmail as jest.Mock).mockClear();
    (queueBackgroundEmail as jest.Mock).mockClear();
    (discardQueuedEmailsFor as jest.Mock).mockClear();
  });

  it('queues the bill and leaves the row waiting for its mail, not marked as sent', async () => {
    const { payload, updates } = payloadDouble(participantRow());

    const summary = await sendBills(payload, undefined, {
      hitobitoService: hitobitoDouble(jest.fn().mockResolvedValue({ changed: false })),
    });

    expect(sendTrackedEmail).not.toHaveBeenCalled();
    const [, mail, participantId] = (queueBackgroundEmail as jest.Mock).mock.calls[0] as [
      unknown,
      { to: string; attachments: { filename: string }[] },
      string,
    ];
    expect(mail.to).toBe('max@example.com');
    expect(mail.attachments[0]?.filename).toBe('rechnung-2027-0001.pdf');
    expect(participantId).toBe('doc-1');

    expect(updates[0]?.['status']).toBe('bill_mail_pending');
    // The send date belongs to the moment the mail leaves the queue.
    expect(updates[0]).not.toHaveProperty('billSentDate');
    expect(summary).toMatchObject({ sentCount: 0, queuedCount: 1, failedCount: 0 });
  });

  it('parks the bill when its mail cannot be queued, after the Cevi.DB was told', async () => {
    (queueBackgroundEmail as jest.Mock).mockRejectedValueOnce(new Error('S3 unreachable'));
    const { payload, updates } = payloadDouble(participantRow());

    const summary = await sendBills(payload, undefined, {
      hitobitoService: hitobitoDouble(
        jest.fn().mockResolvedValue({ changed: true, previous: 'erfasst durch AVP' }),
      ),
    });

    // The row recorded the write-back before the mail was attempted, so the park can revert it.
    expect(updates[0]?.['status']).toBe('bill_mail_pending');
    expect(mockMarkBillMailNotQueued).toHaveBeenCalledWith(payload, 'doc-1', 'S3 unreachable');
    expect(summary.queuedCount ?? 0).toBe(0);
    expect(summary.failedCount).toBe(1);
  });

  it('sends a single bill an operator asked for on the spot', async () => {
    const { payload, updates } = payloadDouble(participantRow({ status: 'bill_mail_pending' }));

    const summary = await sendBills(payload, 'doc-1', {
      hitobitoService: hitobitoDouble(jest.fn().mockResolvedValue({ changed: false })),
    });

    expect(queueBackgroundEmail).not.toHaveBeenCalled();
    expect(sendTrackedEmail).toHaveBeenCalledTimes(1);
    // The mail still waiting for this bill would otherwise arrive a second time.
    expect(discardQueuedEmailsFor).toHaveBeenCalledWith(payload, 'doc-1', expect.any(String));
    expect(updates[0]?.['status']).toBe('bill_sent');
    expect(typeof updates[0]?.['billSentDate']).toBe('string');
    expect(summary).toMatchObject({ sentCount: 1, failedCount: 0 });
  });

  it('does not mark a single bill as sent when the mail server refuses it', async () => {
    (sendTrackedEmail as jest.Mock).mockResolvedValueOnce({
      success: false,
      outgoingEmailId: 'mail-1',
      error: '550 mailbox unavailable',
    });
    const { payload, updates } = payloadDouble(participantRow());
    const update = jest.fn();

    const summary = await sendBills(payload, 'doc-1', {
      hitobitoService: hitobitoDouble(update),
    });

    // The failed mail has parked the bill for review; nothing here may overwrite that.
    expect(updates).toHaveLength(0);
    expect(update).not.toHaveBeenCalled();
    expect(summary).toMatchObject({ sentCount: 0, failedCount: 1 });
    expect(summary.errors[0]).toContain('550 mailbox unavailable');
  });

  it.each(['paid', 'removed'])(
    'does not send the bill again to a %s registration',
    async (status) => {
      const { payload, updates } = payloadDouble(participantRow({ status }));

      const summary = await sendBills(payload, 'doc-1', {
        hitobitoService: hitobitoDouble(jest.fn()),
      });

      expect(sendTrackedEmail).not.toHaveBeenCalled();
      expect(updates).toHaveLength(0);
      expect(summary.failedCount).toBe(1);
      expect(summary.errors[0]).toContain('Max Mustermann');
    },
  );
});

/** The mail a bulk run queues for the one participant, under the given bill settings. */
const queuedBillMail = async (
  billSettings: Record<string, unknown>,
  row: Record<string, unknown> = participantRow(),
): Promise<{ subject: string; text: string }> => {
  (queueBackgroundEmail as jest.Mock).mockClear();
  const { payload } = payloadDouble(row, 'cookie', billSettings);

  await sendBills(payload, undefined, {
    hitobitoService: hitobitoDouble(jest.fn().mockResolvedValue({ changed: false })),
  });

  const [, mail] = (queueBackgroundEmail as jest.Mock).mock.calls[0] as [
    unknown,
    { subject: string; text: string },
  ];
  return mail;
};

describe('sendBills names the Anmeldenummer in the bill mail', () => {
  it('uses the number stored with the bill, even after the template changed', async () => {
    const mail = await queuedBillMail(
      {
        customReferenceTemplate: '{{year}}-{{participation-id}}',
        invoiceEmailSubject: 'conveniat27 – Rechnung {{registrationNumber}}',
      },
      participantRow({ registrationNumber: 'event-1-part-1' }),
    );

    expect(mail.subject).toBe('conveniat27 – Rechnung event-1-part-1');
  });

  it('fills it from the template for a bill created before the number was stored', async () => {
    const mail = await queuedBillMail({
      customReferenceTemplate: '{{event-id}}-{{participation-id}}',
      invoiceEmailSubject: 'conveniat27 – Rechnung {{registrationNumber}}',
      invoiceEmailBody: 'Deine Anmeldenummer: {{registrationNumber}}',
    });

    expect(mail.subject).toBe('conveniat27 – Rechnung event-1-part-1');
    expect(mail.text).toBe('Deine Anmeldenummer: event-1-part-1');
  });

  it('leaves no dangling placeholder when no Anmeldenummer is configured', async () => {
    const mail = await queuedBillMail({
      customReferenceTemplate: '',
      invoiceEmailSubject: 'conveniat27 – Rechnung {{registrationNumber}}',
    });

    expect(mail.subject).toBe('conveniat27 – Rechnung');
  });
});
