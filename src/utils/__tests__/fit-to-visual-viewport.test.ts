/**
 * @jest-environment jsdom
 */

import { fitToVisualViewport } from '@/utils/fit-to-visual-viewport';

/** A visual viewport whose size the test moves, like a browser opening its keyboard. */
class FakeVisualViewport extends EventTarget {
  height = 664;
  offsetTop = 0;
  scale = 1;

  /** `scrolledBy` is how far the browser scrolls to reveal the focused input, at most the keyboard */
  openKeyboard(keyboardHeight: number, scrolledBy = keyboardHeight): void {
    this.height -= keyboardHeight;
    this.offsetTop = scrolledBy;
    this.dispatchEvent(new Event('resize'));
    this.dispatchEvent(new Event('scroll'));
  }
}

describe('fitToVisualViewport', () => {
  let viewport: FakeVisualViewport;
  let element: HTMLElement;

  beforeEach(() => {
    viewport = new FakeVisualViewport();
    Object.defineProperty(globalThis, 'visualViewport', { value: viewport, configurable: true });
    Object.defineProperty(globalThis, 'innerHeight', { value: 664, configurable: true });
    element = document.createElement('div');
  });

  const fittedTo = (): { height: string; top: string; bottom: string } => ({
    height: element.style.getPropertyValue('--visual-viewport-height'),
    top: element.style.getPropertyValue('--visual-viewport-top'),
    bottom: element.style.getPropertyValue('--visual-viewport-bottom'),
  });

  it('keeps the element above the keyboard while it opens', () => {
    fitToVisualViewport(element);
    expect(fittedTo()).toEqual({ height: '664px', top: '0px', bottom: '0px' });

    viewport.openKeyboard(336);
    expect(fittedTo()).toEqual({ height: '328px', top: '336px', bottom: '0px' });
  });

  it('lifts a sheet at the bottom over the keyboard when the browser barely scrolls', () => {
    fitToVisualViewport(element);
    viewport.openKeyboard(336, 40);

    expect(fittedTo()).toEqual({ height: '328px', top: '40px', bottom: '296px' });
  });

  it('falls back to the full screen while the user has zoomed in', () => {
    fitToVisualViewport(element);
    viewport.scale = 2;
    viewport.openKeyboard(0);

    expect(fittedTo()).toEqual({ height: '', top: '', bottom: '' });
  });

  it('stops following the viewport once the element unmounts', () => {
    const cleanup = fitToVisualViewport(element);
    cleanup?.();
    viewport.openKeyboard(336);

    expect(fittedTo()).toEqual({ height: '664px', top: '0px', bottom: '0px' });
  });
});
