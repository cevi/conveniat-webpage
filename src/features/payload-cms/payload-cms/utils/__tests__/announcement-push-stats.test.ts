import type { PushLogSummaryRow } from '@/features/payload-cms/payload-cms/utils/announcement-push-stats';
import { summarizePushLogs } from '@/features/payload-cms/payload-cms/utils/announcement-push-stats';

jest.mock('@/lib/db/prisma', () => ({ __esModule: true, default: {} }));

const log = (
  userId: string,
  status: PushLogSummaryRow['status'],
  interactionType?: string,
): PushLogSummaryRow => ({
  userId,
  status,
  /* eslint-disable unicorn/no-null -- mirrors the Prisma row */
  deliveredAt: status === 'DELIVERED' ? new Date() : null,
  interactionType: interactionType ?? null,
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

  it('treats a push the device confirmed as delivered even if the send was not', () => {
    const confirmedByDevice: PushLogSummaryRow = {
      userId: 'anna',
      status: 'PENDING',
      deliveredAt: new Date(),
      // eslint-disable-next-line unicorn/no-null -- mirrors the Prisma row
      interactionType: null,
    };

    expect(summarizePushLogs([confirmedByDevice], 0).delivered).toBe(1);
  });

  it('passes the chat read count through', () => {
    expect(summarizePushLogs([], 7)).toEqual({
      recipients: 0,
      delivered: 0,
      clicked: 0,
      dismissed: 0,
      failed: 0,
      readInChat: 7,
    });
  });
});
