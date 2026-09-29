/**
 * @jest-environment jsdom
 */

import { fitToVisualViewport } from '@/features/chat/utils/fit-to-visual-viewport';

/** A visual viewport whose size the test moves, like a browser opening its keyboard. */
class FakeVisualViewport extends EventTarget {
  height = 664;
  offsetTop = 0;
  scale = 1;

  openKeyboard(keyboardHeight: number): void {
    this.height -= keyboardHeight;
    this.offsetTop = keyboardHeight;
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
    element = document.createElement('div');
  });

  const fittedTo = (): { height: string; top: string } => ({
    height: element.style.getPropertyValue('--visual-viewport-height'),
    top: element.style.getPropertyValue('--visual-viewport-top'),
  });

  it('keeps the element above the keyboard while it opens', () => {
    fitToVisualViewport(element);
    expect(fittedTo()).toEqual({ height: '664px', top: '0px' });

    viewport.openKeyboard(336);
    expect(fittedTo()).toEqual({ height: '328px', top: '336px' });
  });

  it('falls back to the full screen while the user has zoomed in', () => {
    fitToVisualViewport(element);
    viewport.scale = 2;
    viewport.openKeyboard(0);

    expect(fittedTo()).toEqual({ height: '', top: '' });
  });

  it('stops following the viewport once the element unmounts', () => {
    const cleanup = fitToVisualViewport(element);
    cleanup?.();
    viewport.openKeyboard(336);

    expect(fittedTo()).toEqual({ height: '664px', top: '0px' });
  });
});
