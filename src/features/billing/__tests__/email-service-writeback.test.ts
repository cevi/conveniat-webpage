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
jest.mock('@/features/registration_process/hitobito-api', () => ({
  HITOBITO_CONFIG: { baseUrl: 'http://mock', apiToken: 'mock' },
}));

import type { HitobitoServicePort } from '@/features/billing/ports/hitobito-service.port';
import { sendBills } from '@/features/billing/services/email-service';
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
): { payload: Payload; updates: Record<string, unknown>[] } => {
  const updates: Record<string, unknown>[] = [];
  const payload = {
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
    findGlobal: ({ slug }: { slug: string }) =>
      Promise.resolve(slug === 'registration-management' ? { browserCookie } : {}),
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

    expect(summary.sentCount).toBe(1);
    expect(update).toHaveBeenCalledWith(
      'group-1',
      'event-1',
      'part-1',
      ['anmeldestatus'],
      'Rechnung gestellt',
      ['definitiv'],
    );
    // The status is written first, so a failing write-back cannot cost the bill its
    // `bill_sent`; the answer follows in a second update.
    expect(updates[0]?.['status']).toBe('bill_sent');
    expect(updates[1]?.['anmeldestatus']).toBe('Rechnung gestellt');
    expect(summary.errors).toHaveLength(0);
  });

  it('never touches a registration that is already definitiv', async () => {
    const { payload, updates } = payloadDouble(participantRow({ anmeldestatus: 'definitiv' }));
    const update = jest.fn();

    const summary = await sendBills(payload, undefined, {
      hitobitoService: hitobitoDouble(update),
    });

    expect(update).not.toHaveBeenCalled();
    expect(summary.sentCount).toBe(1);
    expect(updates).toHaveLength(1);
  });

  it('still counts the bill as sent when the write-back fails', async () => {
    const { payload, updates } = payloadDouble(participantRow());
    const update = jest.fn().mockRejectedValue(new Error('Status 500'));

    const summary = await sendBills(payload, undefined, {
      hitobitoService: hitobitoDouble(update),
    });

    expect(summary.sentCount).toBe(1);
    expect(summary.failedCount).toBe(0);
    expect(summary.errors[0]).toContain('Max Mustermann');
    const history = updates[1]?.['syncHistory'] as { action: string }[];
    expect(history.at(-1)?.action).toBe('anmeldestatus_writeback_failed');
    // The failed write-back must not invent a value on the row.
    expect(updates[1]?.['anmeldestatus']).toBe('erfasst durch AVP');
  });

  it('links the operator to Registration Management when no cookie is configured', async () => {
    const { payload } = payloadDouble(participantRow(), '');

    const summary = await sendBills(payload);

    expect(summary.sentCount).toBe(1);
    expect(summary.relatedDocuments).toEqual(['registrationManagement']);
    expect(summary.errors[0]).toContain('Registrierungs-Einstellungen');
  });
});
