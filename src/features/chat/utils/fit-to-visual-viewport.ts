/**
 * Ref callback that keeps a fixed, full-screen element inside the visual viewport, so it shrinks
 * above the on-screen keyboard instead of sliding under the top of the screen. Reads the height
 * and offset from `--visual-viewport-height` and `--visual-viewport-top`, which the element's
 * classes fall back from to `100dvh` and `0px`.
 *
 * The keyboard never resizes the layout viewport on iOS Safari, nor on Chrome with our
 * `interactive-widget=resizes-visual`, so `h-dvh` stays at full screen height and the browser
 * scrolls the fixed element up to reveal the focused input, taking the header with it.
 *
 * While the user has pinched in, the visual viewport is a zoomed-in part of the page, not the
 * space left by the keyboard, so the element keeps its full size then.
 *
 * @param element - the fixed element, or `null` when React detaches the ref
 * @returns the cleanup React runs when the element unmounts
 */
export const fitToVisualViewport = (element: HTMLElement | null): (() => void) | undefined => {
  const viewport = globalThis.visualViewport;
  if (element === null || viewport === null) return undefined;

  const fit = (): void => {
    if (viewport.scale === 1) {
      element.style.setProperty('--visual-viewport-height', `${viewport.height}px`);
      element.style.setProperty('--visual-viewport-top', `${viewport.offsetTop}px`);
    } else {
      element.style.removeProperty('--visual-viewport-height');
      element.style.removeProperty('--visual-viewport-top');
    }
  };

  fit();
  viewport.addEventListener('resize', fit);
  viewport.addEventListener('scroll', fit);
  return (): void => {
    viewport.removeEventListener('resize', fit);
    viewport.removeEventListener('scroll', fit);
  };
};
