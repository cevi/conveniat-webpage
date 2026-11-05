/**
 * @jest-environment jsdom
 */

import { useChosenQuickAccess } from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/dashboard/hooks/use-chosen-quick-access';
import { DEFAULT_QUICK_ACCESS } from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/dashboard/utils/quick-access-tiles';
import { act, renderHook } from '@testing-library/react';

describe('useChosenQuickAccess', () => {
  beforeEach(() => globalThis.localStorage.clear());

  it('shows the default tiles until the user chooses', () => {
    const { result } = renderHook(() => useChosenQuickAccess());
    expect(result.current.chosen).toEqual(DEFAULT_QUICK_ACCESS);
    expect(result.current.isCustomized).toBe(false);
  });

  it('remembers the choice when Home opens again', () => {
    const first = renderHook(() => useChosenQuickAccess());
    act(() => first.result.current.setChosen(['map', 'qr']));
    first.unmount();

    const { result } = renderHook(() => useChosenQuickAccess());
    expect(result.current.chosen).toEqual(['map', 'qr']);
    expect(result.current.isCustomized).toBe(true);
  });

  it('goes back to the default', () => {
    const { result } = renderHook(() => useChosenQuickAccess());
    act(() => result.current.setChosen([]));
    expect(result.current.chosen).toEqual([]);

    act(() => result.current.reset());
    expect(result.current.chosen).toEqual(DEFAULT_QUICK_ACCESS);
    expect(result.current.isCustomized).toBe(false);
  });
});
