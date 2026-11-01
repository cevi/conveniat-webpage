/**
 * @jest-environment jsdom
 */

import { usePackedItems } from '@/features/schedule/hooks/use-packed-items';
import { act, renderHook } from '@testing-library/react';

describe('usePackedItems', () => {
  beforeEach(() => globalThis.localStorage.clear());

  it('remembers a ticked item when the page opens again', () => {
    const first = renderHook(() => usePackedItems('ballspiele'));
    act(() => first.result.current.togglePacked('Sportschuhe'));
    first.unmount();

    const { result } = renderHook(() => usePackedItems('ballspiele'));
    expect([...result.current.packed]).toEqual(['Sportschuhe']);
  });

  it('unticks an item and keeps each block to its own list', () => {
    const { result } = renderHook(() => usePackedItems('ballspiele'));
    act(() => result.current.togglePacked('Sportschuhe'));
    act(() => result.current.togglePacked('Trinkflasche'));
    act(() => result.current.togglePacked('Sportschuhe'));

    expect([...result.current.packed]).toEqual(['Trinkflasche']);
    expect(renderHook(() => usePackedItems('wanderung')).result.current.packed.size).toBe(0);
  });

  it('starts empty from storage it cannot read', () => {
    globalThis.localStorage.setItem('schedule-packed:ballspiele', '{not json');
    const { result } = renderHook(() => usePackedItems('ballspiele'));
    expect(result.current.packed.size).toBe(0);
  });
});
