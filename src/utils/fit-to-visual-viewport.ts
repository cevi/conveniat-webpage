/**
 * Ref callback that keeps a fixed element inside the visual viewport, so it sits above the
 * on-screen keyboard instead of under it. Writes the visual viewport's height, its offset from the
 * top and the part of the layout viewport the keyboard covers to `--visual-viewport-height`,
 * `--visual-viewport-top` and `--visual-viewport-bottom`, which the element's classes fall back
 * from to `100dvh`, `0px` and `0px`.
 *
 * The keyboard never resizes the layout viewport on iOS Safari, nor on Chrome and the Android
 * WebView with our `interactive-widget=resizes-visual`, so `h-dvh` stays at full screen height,
 * `bottom-0` stays behind the keyboard, and the browser only scrolls far enough to reveal the
 * focused input.
 *
 * While the user has pinched in, the visual viewport is a zoomed-in part of the page, not the
 * space left by the keyboard, so the element keeps its full size then.
 *
 * @param element - the fixed element, or `null` when React detaches the ref
 * @returns the cleanup React runs when the element unmounts
 */
export const fitToVisualViewport = (element: HTMLElement | null): (() => void) | undefined => {
  // typed as always there, but missing outside a browser, e.g. in jsdom
  if (element === null || !('visualViewport' in globalThis)) return undefined;
  const viewport = globalThis.visualViewport;
  if (viewport === null) return undefined;

  const fit = (): void => {
    if (viewport.scale === 1) {
      const covered = Math.max(0, globalThis.innerHeight - viewport.offsetTop - viewport.height);
      element.style.setProperty('--visual-viewport-height', `${viewport.height}px`);
      element.style.setProperty('--visual-viewport-top', `${viewport.offsetTop}px`);
      element.style.setProperty('--visual-viewport-bottom', `${covered}px`);
    } else {
      element.style.removeProperty('--visual-viewport-height');
      element.style.removeProperty('--visual-viewport-top');
      element.style.removeProperty('--visual-viewport-bottom');
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
