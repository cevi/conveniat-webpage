import type { PushLogSummaryRow } from '@/features/payload-cms/payload-cms/utils/announcement-push-stats';
import { summarizePushLogs } from '@/features/payload-cms/payload-cms/utils/announcement-push-stats';

jest.mock('@/lib/db/prisma', () => ({ __esModule: true, default: {} }));

const log = (
  userId: string,
  status: PushLogSummaryRow['status'],
  interactionType?: string,
  error?: string,
): PushLogSummaryRow => ({
  userId,
  status,
  /* eslint-disable unicorn/no-null -- mirrors the Prisma row */
  deliveredAt: status === 'DELIVERED' ? new Date() : null,
  interactionType: interactionType ?? null,
  error: error ?? null,
  /* eslint-enable unicorn/no-null */
});

describe('summarizePushLogs', () => {
  it('counts a person with several devices once', () => {
    const stats = summarizePushLogs(
      [
        log('anna', 'DELIVERED', 'CLICK'),
        log('anna', 'DELIVERED', 'DISMISS'),
        log('ben', 'DELIVERED'),
      ],
      0,
    );

    expect(stats).toMatchObject({ recipients: 2, delivered: 2, clicked: 1, dismissed: 0 });
  });

  it('counts a person as failed only when no push reached them', () => {
    const stats = summarizePushLogs(
      [log('anna', 'FAILED'), log('anna', 'DELIVERED'), log('ben', 'FAILED')],
      0,
    );

    expect(stats).toMatchObject({ recipients: 2, delivered: 1, failed: 1 });
  });

  /**
   * The push service accepting a send says nothing about the phone. Counting it as
   * delivered would show an editor a push as having arrived on a phone that was off.
   */
  it('counts a push the device never confirmed as accepted, not delivered', () => {
    const stats = summarizePushLogs([log('anna', 'SENT'), log('ben', 'DELIVERED')], 0);

    expect(stats).toMatchObject({ recipients: 2, accepted: 2, delivered: 1, failed: 0 });
  });

  it('does not count a person as failed when one of their pushes was accepted', () => {
    const stats = summarizePushLogs([log('anna', 'FAILED'), log('anna', 'SENT')], 0);

    expect(stats).toMatchObject({ accepted: 1, delivered: 0, failed: 0 });
  });

  it('treats a push the device confirmed as delivered even if the send was not', () => {
    const confirmedByDevice: PushLogSummaryRow = {
      userId: 'anna',
      status: 'PENDING',
      deliveredAt: new Date(),
      /* eslint-disable unicorn/no-null -- mirrors the Prisma row */
      interactionType: null,
      error: null,
      /* eslint-enable unicorn/no-null */
    };

    expect(summarizePushLogs([confirmedByDevice], 0)).toMatchObject({ accepted: 1, delivered: 1 });
  });

  it('passes the chat read count through', () => {
    expect(summarizePushLogs([], 7)).toEqual({
      recipients: 0,
      accepted: 0,
      delivered: 0,
      clicked: 0,
      dismissed: 0,
      failed: 0,
      pending: 0,
      retrying: 0,
      readInChat: 7,
    });
  });

  /**
   * A person whose push is still on the queue has not failed yet, even if their other device
   * refused it. Counting them as failed would show an editor a loss that fixes itself.
   */
  it('counts a person still waiting on the queue as pending, not failed', () => {
    const stats = summarizePushLogs(
      [log('anna', 'FAILED'), log('anna', 'PENDING'), log('ben', 'PENDING'), log('cleo', 'SENT')],
      0,
    );

    expect(stats).toMatchObject({ recipients: 3, accepted: 1, failed: 0, pending: 2 });
  });

  it('counts a pending push with an error as a retry', () => {
    const stats = summarizePushLogs(
      [log('anna', 'PENDING', undefined, 'Push service answered 503'), log('ben', 'PENDING')],
      0,
    );

    expect(stats).toMatchObject({ pending: 2, retrying: 1 });
  });

  it('stops counting a person as pending once one of their devices got the push', () => {
    const stats = summarizePushLogs(
      [log('anna', 'PENDING', undefined, 'timeout'), log('anna', 'SENT')],
      0,
    );

    expect(stats).toMatchObject({ accepted: 1, pending: 0, retrying: 0 });
  });
});
