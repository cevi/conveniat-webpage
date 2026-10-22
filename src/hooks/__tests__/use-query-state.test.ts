/**
 * @jest-environment jsdom
 */

import { useQueryState } from '@/hooks/use-query-state';
import { renderHook } from '@testing-library/react';

describe('useQueryState', () => {
  beforeEach(() => {
    globalThis.history.replaceState({}, '', '/app/map');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('leaves the address alone when nothing is selected', () => {
    // a write here cancels a navigation the user started meanwhile
    const replaceState = jest.spyOn(globalThis.history, 'replaceState');
    const pushState = jest.spyOn(globalThis.history, 'pushState');

    renderHook(() => useQueryState('locationId', undefined, jest.fn()));

    expect(replaceState).not.toHaveBeenCalled();
    expect(pushState).not.toHaveBeenCalled();
  });

  it('adds a history entry when something is selected', () => {
    const pushState = jest.spyOn(globalThis.history, 'pushState');

    renderHook(() => useQueryState('locationId', 'place-1', jest.fn()));

    expect(pushState).toHaveBeenCalledWith({}, '', 'http://localhost/app/map?locationId=place-1');
  });
});
