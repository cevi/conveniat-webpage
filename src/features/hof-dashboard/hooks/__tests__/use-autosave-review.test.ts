/**
 * @jest-environment jsdom
 */

const mutateAsync = jest.fn();
let resolveReload: () => void = () => {};
const invalidate = jest.fn(
  () =>
    new Promise<void>((resolve) => {
      resolveReload = resolve;
    }),
);

jest.mock('@/trpc/client', () => ({
  trpc: {
    useUtils: (): unknown => ({ hofDashboard: { getHofDashboard: { invalidate } } }),
    hofDashboard: {
      updateSubmissionReview: { useMutation: (): unknown => ({ mutateAsync }) },
    },
  },
}));
jest.mock('@/features/hof-dashboard/hooks/use-warn-before-leaving', () => ({
  useWarnBeforeLeaving: jest.fn(),
}));

import { useAutosaveReview } from '@/features/hof-dashboard/hooks/use-autosave-review';
import { act, renderHook } from '@testing-library/react';

describe('useAutosaveReview', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mutateAsync.mockReset().mockResolvedValue({});
    invalidate.mockClear();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('saves feedback typed while the dashboard reloads after a status was saved', async () => {
    const { result } = renderHook(() =>
      useAutosaveReview('hof-nord', 'program-1', {
        status: undefined,
        feedback: '',
        final: false,
      }),
    );

    // the status goes out at once, then the dashboard reloads
    await act(async () => {
      result.current.setStatus('accepted');
      await Promise.resolve();
    });
    expect(mutateAsync).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledTimes(1);

    // the reviewer types before the reload has come back, and pauses
    act(() => result.current.setFeedback('Danke, passt so.'));
    await act(async () => {
      await jest.advanceTimersByTimeAsync(1000);
    });

    expect(mutateAsync).toHaveBeenCalledTimes(2);
    expect(mutateAsync).toHaveBeenLastCalledWith({
      hofId: 'hof-nord',
      submissionId: 'program-1',
      status: 'accepted',
      feedback: 'Danke, passt so.',
      final: false,
    });
    act(() => resolveReload());
  });
});
