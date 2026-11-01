/**
 * @jest-environment jsdom
 */
import { useKeptScrollPosition } from '@/features/material/hooks/use-kept-scroll-position';
import { act, renderHook } from '@testing-library/react';

const scrollBy = (y: number): void => {
  Object.defineProperty(globalThis, 'scrollY', { value: y, configurable: true, writable: true });
  globalThis.dispatchEvent(new Event('scroll'));
};

describe('useKeptScrollPosition', () => {
  let scrollTo: jest.SpyInstance;

  beforeEach(() => {
    scrollTo = jest.spyOn(globalThis, 'scrollTo').mockImplementation(() => {});
    scrollBy(0);
  });

  afterEach(() => scrollTo.mockRestore());

  it('opens the article at the top and brings the list back where it was left', () => {
    const { rerender } = renderHook(({ hidden }) => useKeptScrollPosition(hidden), {
      initialProps: { hidden: false },
    });
    expect(scrollTo).not.toHaveBeenCalled();

    act(() => scrollBy(1200));
    rerender({ hidden: true });
    expect(scrollTo).toHaveBeenLastCalledWith(0, 0);

    // the browser clamps the shortened page, and the reader scrolls through the article
    act(() => scrollBy(0));
    act(() => scrollBy(300));
    rerender({ hidden: false });
    expect(scrollTo).toHaveBeenLastCalledWith(0, 1200);
  });

  it('leaves the scroll alone on a page opened straight on an article', () => {
    renderHook(() => useKeptScrollPosition(true));
    expect(scrollTo).not.toHaveBeenCalled();
  });
});
