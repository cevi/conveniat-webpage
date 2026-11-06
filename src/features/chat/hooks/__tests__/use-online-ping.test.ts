/**
 * @jest-environment jsdom
 */

import { useOnlinePing } from '@/features/chat/hooks/use-online-ping';
import type { TestTrpc } from '@/trpc/test-trpc';
import { createTestTrpc } from '@/trpc/test-trpc';
import { act, renderHook } from '@testing-library/react';

jest.mock('next-auth/react', () => ({
  useSession: (): unknown => ({ status: 'authenticated' }),
}));

jest.mock(
  '@/trpc/client',
  () =>
    jest.requireActual<typeof import('@/trpc/test-trpc')>('@/trpc/test-trpc').mockTrpcClientModule,
);

const advance = async (ms: number): Promise<void> => {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });
};

describe('useOnlinePing', () => {
  let visibilityState: DocumentVisibilityState = 'visible';
  let testTrpc: TestTrpc;

  /** the pings that reached the server, once the mutations in flight have been sent */
  const pingCount = async (): Promise<number> => {
    await act(async () => {
      await Promise.resolve();
    });
    return testTrpc.calls.filter((call) => call.path === 'chat.onlinePing').length;
  };

  const setVisibility = (state: DocumentVisibilityState): void => {
    visibilityState = state;
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
  };

  beforeAll(() => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => visibilityState,
    });
  });

  beforeEach(() => {
    jest.useFakeTimers();
    visibilityState = 'visible';
    testTrpc = createTestTrpc({ 'chat.onlinePing': (): void => {} });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('pings at once and then often enough to stay inside the 30 s online window', async () => {
    const { unmount } = renderHook(() => useOnlinePing(), { wrapper: testTrpc.wrapper });
    expect(await pingCount()).toBe(1);

    await advance(25_000);
    expect(await pingCount()).toBe(2);

    unmount();
  });

  it('stops pinging while the app is in the background', async () => {
    const { unmount } = renderHook(() => useOnlinePing(), { wrapper: testTrpc.wrapper });
    const pingsWhileVisible = await pingCount();

    setVisibility('hidden');
    await advance(10 * 60 * 1000);

    expect(await pingCount()).toBe(pingsWhileVisible);
    unmount();
  });

  it('pings at once when the app comes back to the foreground', async () => {
    visibilityState = 'hidden';
    const { unmount } = renderHook(() => useOnlinePing(), { wrapper: testTrpc.wrapper });
    expect(await pingCount()).toBe(0);

    setVisibility('visible');
    expect(await pingCount()).toBe(1);

    await advance(25_000);
    expect(await pingCount()).toBe(2);

    unmount();
  });

  it('stops pinging when the chat is closed', async () => {
    const { unmount } = renderHook(() => useOnlinePing(), { wrapper: testTrpc.wrapper });
    unmount();
    const pingsWhileOpen = await pingCount();

    await advance(60_000);

    expect(await pingCount()).toBe(pingsWhileOpen);
  });
});
