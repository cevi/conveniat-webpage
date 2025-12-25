import type { Locale } from '@/types/types';
import { DesignCodes } from '@/utils/design-codes';
import { renderInAppDesign } from '@/utils/render-in-app-design';
import type { Viewport } from 'next';

interface Properties {
  params: Promise<{
    locale?: Locale;
    design?: DesignCodes;
  }>;
}

/**
 * Generates the viewport meta tag as specified by
 * https://developer.mozilla.org/en-US/docs/Web/HTML/Viewport_meta_tag
 *
 */
export const generateViewport = async ({ params }: Properties): Promise<Viewport> => {
  const { design } = await params;

  // if possible we determine the design from the url parameters
  // otherwise we check it using the cookies (forces the page to become dynamic)
  const isInAppDesign =
    design === undefined ? await renderInAppDesign() : design === DesignCodes.APP_DESIGN;

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
