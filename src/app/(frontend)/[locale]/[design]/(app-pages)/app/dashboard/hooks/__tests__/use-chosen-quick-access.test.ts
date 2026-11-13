/**
 * @jest-environment jsdom
 */

import { useChosenQuickAccess } from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/dashboard/hooks/use-chosen-quick-access';
import { createTestTrpc } from '@/trpc/test-trpc';
import { renderHook, waitFor } from '@testing-library/react';

jest.mock(
  '@/trpc/client',
  () =>
    jest.requireActual<typeof import('@/trpc/test-trpc')>('@/trpc/test-trpc').mockTrpcClientModule,
);

// what the editors configured on the App Landing Page global
const cmsDefault = ['schedule', 'map', 'chat'] as const;

describe('useChosenQuickAccess', () => {
  it('gives a user who never chose the default of the CMS, in its order', async () => {
    const testTrpc = createTestTrpc({ 'quickAccess.getQuickAccess': () => ({ tiles: null }) });
    const { result } = renderHook(() => useChosenQuickAccess(true, cmsDefault), {
      wrapper: testTrpc.wrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.chosen).toEqual(['schedule', 'map', 'chat']);
    expect(result.current.isCustomized).toBe(false);
  });

  it('keeps the own choice of a user who chose', async () => {
    const testTrpc = createTestTrpc({ 'quickAccess.getQuickAccess': () => ({ tiles: ['qr'] }) });
    const { result } = renderHook(() => useChosenQuickAccess(true, cmsDefault), {
      wrapper: testTrpc.wrapper,
    });

    await waitFor(() => expect(result.current.chosen).toEqual(['qr']));
    expect(result.current.isCustomized).toBe(true);
  });

  it('gives a guest the default of the CMS without asking the server', () => {
    const testTrpc = createTestTrpc();
    const { result } = renderHook(() => useChosenQuickAccess(false, cmsDefault), {
      wrapper: testTrpc.wrapper,
    });

    expect(result.current.chosen).toEqual(['schedule', 'map', 'chat']);
    expect(testTrpc.calls).toEqual([]);
  });
});
