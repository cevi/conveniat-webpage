/**
 * @jest-environment jsdom
 */
import { useTabInAddress } from '@/features/hof-dashboard/hooks/use-tab-in-address';
import { act, renderHook } from '@testing-library/react';

const TABS = ['overview', 'program', 'material'] as const;

/** Goes one entry back and waits for the popstate jsdom dispatches asynchronously. */
const goBack = async (): Promise<void> => {
  const popped = new Promise((resolve) =>
    globalThis.addEventListener('popstate', resolve, { once: true }),
  );
  globalThis.history.back();
  await popped;
};

describe('useTabInAddress', () => {
  beforeEach(() => {
    globalThis.history.replaceState(undefined, '', '/hof-dashboard');
  });

  it('opens the tab the address names', () => {
    globalThis.history.replaceState(undefined, '', '/hof-dashboard#material');
    const { result } = renderHook(() => useTabInAddress(TABS, 'overview'));
    expect(result.current[0]).toBe('material');
  });

  it('returns to the overview on back after switching to a tab', async () => {
    const { result } = renderHook(() => useTabInAddress(TABS, 'overview'));
    const lengthBefore = globalThis.history.length;

    act(() => result.current[1]('program'));
    expect(globalThis.location.hash).toBe('#program');
    expect(globalThis.history.length).toBe(lengthBefore + 1);

    await act(goBack);
    expect(globalThis.location.hash).toBe('');
    expect(result.current[0]).toBe('overview');
  });

  it('adds no entry when the open tab is chosen again', () => {
    const { result } = renderHook(() => useTabInAddress(TABS, 'overview'));
    const lengthBefore = globalThis.history.length;
    act(() => result.current[1]('overview'));
    expect(globalThis.history.length).toBe(lengthBefore);
  });
});
