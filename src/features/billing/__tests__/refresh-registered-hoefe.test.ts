jest.mock('@/features/payload-cms/payload-cms/utils/hof-membership', () => ({
  refreshUserHoefe: jest.fn(),
}));

import {
  refreshHoefeAfterRegistrationChange,
  refreshHoefeAfterRegistrationDelete,
} from '@/features/billing/collections/refresh-registered-hoefe';
import { refreshUserHoefe } from '@/features/payload-cms/payload-cms/utils/hof-membership';
import type { PayloadRequest } from 'payload';

const refresh = jest.mocked(refreshUserHoefe);
const request = { payload: { logger: { error: jest.fn() } } } as unknown as PayloadRequest;

const REGISTRATION = { userId: '7', eventId: '991001', active: true, status: 'new' };

const change = async (
  current: Record<string, unknown>,
  previous?: Record<string, unknown>,
): Promise<void> => {
  await refreshHoefeAfterRegistrationChange({
    doc: current,
    previousDoc: previous,
    operation: previous === undefined ? 'create' : 'update',
    req: request,
  } as unknown as Parameters<typeof refreshHoefeAfterRegistrationChange>[0]);
};

describe('refreshing the Höfe when a registration changes', () => {
  beforeEach(() => refresh.mockReset());

  it('gives a newly registered person their Hof', async () => {
    await change(REGISTRATION);
    expect(refresh).toHaveBeenCalledWith(request.payload, { ceviIds: [7], req: request });
  });

  it('leaves the Höfe alone when the sync only rewrites the same registration', async () => {
    await change({ ...REGISTRATION, status: 'bill_sent' }, REGISTRATION);
    expect(refresh).not.toHaveBeenCalled();
  });

  it('takes a person out when the registration is removed', async () => {
    await change({ ...REGISTRATION, status: 'removed' }, REGISTRATION);
    expect(refresh).toHaveBeenCalledWith(request.payload, { ceviIds: [7], req: request });
  });

  it('refreshes both people when a registration moves to someone else', async () => {
    await change({ ...REGISTRATION, userId: '9' }, REGISTRATION);
    expect(refresh).toHaveBeenCalledWith(request.payload, { ceviIds: [9, 7], req: request });
  });

  it('refreshes the person of a deleted registration', async () => {
    await refreshHoefeAfterRegistrationDelete({
      doc: REGISTRATION,
      req: request,
    } as unknown as Parameters<typeof refreshHoefeAfterRegistrationDelete>[0]);
    expect(refresh).toHaveBeenCalledWith(request.payload, { ceviIds: [7], req: request });
  });

  it('does not fail the sync when the refresh fails', async () => {
    refresh.mockRejectedValueOnce(new Error('mongo down'));
    await expect(change(REGISTRATION)).resolves.toBeUndefined();
  });
});
