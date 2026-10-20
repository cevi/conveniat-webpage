jest.mock('@/config/environment-variables', () => ({ environmentVariables: {} }));
jest.mock('@/features/payload-cms/payload-cms/access-rules/roles', () => ({
  hasAccessToThis: (): boolean => true,
  Roles: { FullAdmin: 'full-admin' },
}));
jest.mock('@/features/payload-cms/payload-cms/utils/email-suppression', () => ({
  splitSuppressedRecipients: (): Promise<unknown> =>
    Promise.resolve({ deliverable: ['eltern@example.com'], suppressed: [] }),
  suppressedReason: (): string => '',
}));
const mockLoadQueuedAttachments = jest.fn();
jest.mock('@/features/payload-cms/payload-cms/utils/email-outbox', () => ({
  loadQueuedAttachments: (...args: unknown[]): unknown => mockLoadQueuedAttachments(...args),
  releaseQueuedAttachments: jest.fn(),
}));

import { resendOutgoingEmailHandler } from '@/features/payload-cms/payload-cms/endpoints/resend-outgoing-email';
import type { PayloadRequest } from 'payload';

const resend = async (
  mail: Record<string, unknown>,
): Promise<{ status: number; sendEmail: jest.Mock }> => {
  const sendEmail = jest.fn().mockResolvedValue({});
  const request = {
    user: { id: 'admin' },
    routeParams: { id: 'mail-1' },
    payload: {
      findByID: jest.fn().mockResolvedValue({
        id: 'mail-1',
        to: 'eltern@example.com',
        subject: 'Rechnung',
        text: 'Im Anhang',
        ...mail,
      }),
      sendEmail,
      update: jest.fn().mockResolvedValue({}),
      logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
    },
  } as unknown as PayloadRequest;
  const response = await resendOutgoingEmailHandler(request);
  return { status: response.status, sendEmail };
};

describe('resending an outgoing email from its row', () => {
  beforeEach(() => mockLoadQueuedAttachments.mockReset());

  it('refuses a bill mail that no longer has its PDF', async () => {
    mockLoadQueuedAttachments.mockResolvedValue([]);

    const { status, sendEmail } = await resend({ billParticipant: 'p1' });

    expect(status).toBe(409);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('resends a bill mail that still has its PDF', async () => {
    mockLoadQueuedAttachments.mockResolvedValue([
      { filename: 'rechnung.pdf', content: Buffer.from('') },
    ]);

    const { sendEmail } = await resend({ billParticipant: 'p1' });

    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it('resends any other mail without attachments', async () => {
    mockLoadQueuedAttachments.mockResolvedValue([]);

    const { sendEmail } = await resend({});

    expect(sendEmail).toHaveBeenCalledTimes(1);
  });
});
