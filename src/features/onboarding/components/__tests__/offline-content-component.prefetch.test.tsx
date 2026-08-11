/**
 * @jest-environment jsdom
 */

import { OfflineContentEntrypointComponent } from '@/features/onboarding/components/offline-content-component';
import { render } from '@testing-library/react';

const mockPrefetch = jest.fn();

/**
 * A fresh router object on every call.
 *
 * `router.prefetch()` writes into the router cache, which can change the identity React sees for
 * the `router` this component's effect depends on. Combined with `staleTimes.dynamic: 0` — which
 * means a repeat `prefetch()` never resolves from the prefetch cache and always goes to the
 * network — an unguarded effect re-issues the identical `?_rsc=` request at network RTT for as
 * long as the step stays mounted. Measured on conveniat-dev as ~23 req/s sustained from
 * /entrypoint. This mock reproduces the trigger: identity changes on every render.
 */
jest.mock('next/navigation', () => ({
  useRouter: (): { prefetch: jest.Mock } => ({ prefetch: mockPrefetch }),
}));

jest.mock('@/trpc/client', () => ({
  trpc: { useUtils: (): Record<string, never> => ({}) },
}));

jest.mock('@/lib/chat-sync', () => ({
  syncAllOfflineData: jest.fn(),
}));

jest.mock('@/hooks/use-offline-download', () => ({
  useOfflineDownload: (): {
    status: string;
    progress: { total: number; current: number };
    startDownload: jest.Mock;
  } => ({
    status: 'idle',
    progress: { total: 0, current: 0 },
    startDownload: jest.fn(),
  }),
}));

describe('OfflineContentEntrypointComponent route prefetching', () => {
  beforeEach(() => {
    mockPrefetch.mockClear();
  });

  it('prefetches each destination exactly once despite a router identity that changes every render', () => {
    const { rerender } = render(
      <OfflineContentEntrypointComponent callback={jest.fn()} locale="de" />,
    );

    for (let index = 0; index < 25; index++) {
      rerender(<OfflineContentEntrypointComponent callback={jest.fn()} locale="de" />);
    }

    // Two calls total - not two per render. Without the ref guard this is 52.
    expect(mockPrefetch).toHaveBeenCalledTimes(2);
    expect(mockPrefetch).toHaveBeenCalledWith('/app/dashboard');
    expect(mockPrefetch).toHaveBeenCalledWith('/app/chat');
  });
});
