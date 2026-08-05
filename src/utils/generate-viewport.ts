import type { Locale } from '@/types/types';
import { DesignCodes } from '@/utils/design-codes';
import { renderInAppDesign } from '@/utils/render-in-app-design';
import type { Viewport } from 'next';

interface Properties {
  params?: Promise<{
    locale?: Locale;
    design?: DesignCodes;
  }>;
}

/**
 * Generates the viewport meta tag as specified by
 * https://developer.mozilla.org/en-US/docs/Web/HTML/Viewport_meta_tag
 *
 */
export const generateViewport = async (properties?: Properties): Promise<Viewport> => {
  const params = properties?.params ? await properties.params : undefined;

  // Determine the design mode using root-params (via renderInAppDesign) or explicit params
  const isInAppDesign =
    params?.design === undefined
      ? await renderInAppDesign()
      : params.design === DesignCodes.APP_DESIGN;

  return {
    themeColor: [{ media: '(prefers-color-scheme: light)', color: '#E1E6E2' }],
    colorScheme: 'light',
    width: 'device-width',
    viewportFit: 'cover',

    // see https://developer.chrome.com/blog/viewport-resize-behavior
    // this is only needed for Chrome (on Safari, it will raise an error, which can safely be ignored)
    interactiveWidget: 'resizes-visual',

    // disable zooming in the app design
    initialScale: 1,
    minimumScale: 1,
    maximumScale: isInAppDesign ? 1 : 5,
    userScalable: !isInAppDesign,
  };
};
