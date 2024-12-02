import type { Viewport } from 'next';

/**
 * Generates the viewport meta tag as specified by
 * https://developer.mozilla.org/en-US/docs/Web/HTML/Viewport_meta_tag
 *
 */
export const generateViewport = (): Viewport => ({
  themeColor: [{ media: '(prefers-color-scheme: light)', color: '#E1E6E2' }],
  colorScheme: 'light',
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-visual', // default value
});
