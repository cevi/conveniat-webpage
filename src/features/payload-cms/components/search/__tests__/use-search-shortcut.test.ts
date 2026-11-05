/**
 * @jest-environment jsdom
 */

import { useSearchShortcut } from '@/features/payload-cms/components/search/use-search-shortcut';
import { renderHook } from '@testing-library/react';

describe('useSearchShortcut', () => {
  it('opens the search on Ctrl K', () => {
    const onOpen = jest.fn();
    renderHook(() => useSearchShortcut(onOpen));

    globalThis.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));

    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('leaves Ctrl Shift K to the browser', () => {
    const onOpen = jest.fn();
    renderHook(() => useSearchShortcut(onOpen));

    const event = new KeyboardEvent('keydown', {
      key: 'K',
      ctrlKey: true,
      shiftKey: true,
      cancelable: true,
    });
    globalThis.dispatchEvent(event);

    expect(onOpen).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it('ignores a K typed while an input method composes', () => {
    const onOpen = jest.fn();
    renderHook(() => useSearchShortcut(onOpen));

    globalThis.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, isComposing: true }),
    );

    expect(onOpen).not.toHaveBeenCalled();
  });

  it('ignores the key-less keydown Chrome autofill dispatches', () => {
    const onOpen = jest.fn();
    const errors: unknown[] = [];
    const recordError = (event: ErrorEvent): void => {
      errors.push(event.error);
      event.preventDefault();
    };
    globalThis.addEventListener('error', recordError);
    renderHook(() => useSearchShortcut(onOpen));

    globalThis.dispatchEvent(new Event('keydown'));

    globalThis.removeEventListener('error', recordError);
    expect(errors).toEqual([]);
    expect(onOpen).not.toHaveBeenCalled();
  });
});
