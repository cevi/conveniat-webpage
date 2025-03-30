import type { Viewport } from 'next';
import { renderInAppDesign } from '@/utils/render-in-app-design';

/**
 * Generates the viewport meta tag as specified by
 * https://developer.mozilla.org/en-US/docs/Web/HTML/Viewport_meta_tag
 *
 */
export const generateViewport = async (): Promise<Viewport> => {
  const isInAppDesign = await renderInAppDesign();

  return {
    themeColor: [{ media: '(prefers-color-scheme: light)', color: '#E1E6E2' }],
    colorScheme: 'light',
    width: 'device-width',
    viewportFit: 'cover',
    interactiveWidget: 'resizes-visual',

    // disable zooming in the app design
    initialScale: 1,
    minimumScale: 1,
    maximumScale: isInAppDesign ? 1 : 5,
    userScalable: !isInAppDesign,
  };
};
