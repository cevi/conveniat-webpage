/**
 * @jest-environment jsdom
 */

import { useAutosaveReview } from '@/features/hof-dashboard/hooks/use-autosave-review';
import { createTestTrpc } from '@/trpc/test-trpc';
import { useQuery } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';

jest.mock(
  '@/trpc/client',
  () =>
    jest.requireActual<typeof import('@/trpc/test-trpc')>('@/trpc/test-trpc').mockTrpcClientModule,
);
jest.mock('@/features/hof-dashboard/hooks/use-warn-before-leaving', () => ({
  useWarnBeforeLeaving: jest.fn(),
}));

describe('useAutosaveReview', () => {
  it('saves a change made while the dashboard reloads after a status was saved', async () => {
    const updateSubmissionReview = jest.fn().mockResolvedValue({});
    let resolveReload: ((dashboard: unknown) => void) | undefined;
    const getHofDashboard = jest
      .fn()
      .mockResolvedValueOnce({})
      // every later load hangs until the test lets it come back
      .mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveReload = resolve;
          }),
      );
    const { trpc, wrapper } = createTestTrpc({
      'hofDashboard.updateSubmissionReview': updateSubmissionReview,
      'hofDashboard.getHofDashboard': getHofDashboard,
    });
    const { result } = renderHook(
      () => {
        // the dashboard the review sits on, so a reload after a save has someone to load for
        const dashboard = useQuery(
          trpc.hofDashboard.getHofDashboard.queryOptions({ hofId: 'hof-nord', locale: 'de' }),
        );
        const review = useAutosaveReview('hof-nord', 'program-1', {
          status: undefined,
          final: false,
        });
        return { dashboard, review };
      },
      { wrapper },
    );
    await waitFor(() => expect(result.current.dashboard.isSuccess).toBe(true));

    // the status goes out at once, then the dashboard reloads
    act(() => {
      result.current.review.setStatus('accepted');
    });
    await waitFor(() => expect(getHofDashboard).toHaveBeenCalledTimes(2));
    expect(updateSubmissionReview).toHaveBeenCalledTimes(1);

    // the reviewer marks it final before the reload has come back
    act(() => {
      result.current.review.setFinal(true);
    });

    await waitFor(() => expect(updateSubmissionReview).toHaveBeenCalledTimes(2));
    expect(updateSubmissionReview).toHaveBeenLastCalledWith({
      hofId: 'hof-nord',
      submissionId: 'program-1',
      status: 'accepted',
      final: true,
    });
    act(() => resolveReload?.({}));
  });
});
