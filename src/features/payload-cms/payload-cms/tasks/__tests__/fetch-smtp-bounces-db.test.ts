jest.mock('@/lib/db/redis', () => ({ redis: {} }));

import { updateTrackingRecords } from '@/features/payload-cms/payload-cms/tasks/fetch-smtp-bounces/db';
import type { Payload } from 'payload';

const notFound = (): Error => Object.assign(new Error('Not Found'), { status: 404 });
const databaseDown = (): Error => Object.assign(new Error('connection timed out'), { status: 500 });

interface FakePayload {
  findByID: jest.Mock;
  update: jest.Mock;
  logger: { debug: jest.Mock; error: jest.Mock };
}

const fakePayload = (): FakePayload => ({
  findByID: jest.fn(),
  update: jest.fn().mockResolvedValue({}),
  logger: { debug: jest.fn(), error: jest.fn() },
});

const applyBounce = async (payload: FakePayload): Promise<boolean> =>
  updateTrackingRecords(
    payload as unknown as Payload,
    '6aaf08b5969d13ac1b1ae867',
    true,
    'Delivery Status Notification.',
    'raw email',
  );

const bounce = { bounceReport: true, success: false, error: 'Reason:\nAction: failed' };
const delayed = { bounceReport: true, success: false, error: 'Reason:\nAction: delayed' };
const resend = { success: true, retriggeredBy: 'admin' };

const statusAfterSuccessReport = async (smtpResults: unknown[]): Promise<unknown> => {
  const payload = fakePayload();
  payload.findByID.mockResolvedValueOnce({ smtpResults });
  await applyBounce(payload);
  const call = payload.update.mock.calls[0] as [{ data: { deliveryStatus: unknown } }];
  return call[0].data.deliveryStatus;
};

describe('updateTrackingRecords', () => {
  it('reports no match when neither collection holds the envelope id', async () => {
    const payload = fakePayload();
    payload.findByID.mockRejectedValue(notFound());

    await expect(applyBounce(payload)).resolves.toBe(false);
    expect(payload.update).not.toHaveBeenCalled();
  });

  it('throws rather than reporting no match when the outgoing-emails lookup fails', async () => {
    // The caller writes a terminal marker on "no match" and never reads the message again.
    // Reporting a database blip as "this belongs to another deployment" would throw away a
    // delivery notification that is ours.
    const payload = fakePayload();
    payload.findByID.mockRejectedValue(databaseDown());

    await expect(applyBounce(payload)).rejects.toThrow('connection timed out');
  });

  it('throws rather than reporting no match when the form-submissions fallback fails', async () => {
    const payload = fakePayload();
    payload.findByID.mockRejectedValueOnce(notFound()).mockRejectedValueOnce(databaseDown());

    await expect(applyBounce(payload)).rejects.toThrow('connection timed out');
  });

  it('records the bounce on a form submission when the id is an old tracking id', async () => {
    const payload = fakePayload();
    payload.findByID
      .mockRejectedValueOnce(notFound())
      .mockResolvedValueOnce({ smtpResults: [{ success: true }] });

    await expect(applyBounce(payload)).resolves.toBe(true);
    expect(payload.update).toHaveBeenCalledWith(
      expect.objectContaining({ collection: 'form-submissions' }),
    );
  });

  it('keeps an email bounced when a success report is read after the bounce', async () => {
    // The relay's "relayed" report and the recipient server's bounce are two notifications
    // for one message, and the mailbox does not hand them over in the order they happened.
    await expect(statusAfterSuccessReport([bounce])).resolves.toBe('error');
  });

  it('marks an email delivered when a success report is the first verdict', async () => {
    await expect(statusAfterSuccessReport([])).resolves.toBe('success');
  });

  it('marks an email delivered when delivery follows a delay notice', async () => {
    await expect(statusAfterSuccessReport([delayed])).resolves.toBe('success');
  });

  it('marks a resent email delivered although the first attempt bounced', async () => {
    await expect(statusAfterSuccessReport([bounce, resend])).resolves.toBe('success');
  });
});
