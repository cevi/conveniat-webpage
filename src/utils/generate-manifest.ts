import { environmentVariables } from '@/config/environment-variables';
import { LOCALE } from '@/features/payload-cms/payload-cms/locales';
import { manifestIconDefinitions } from '@/utils/icon-definitions';
import config from '@payload-config';
import type { MetadataRoute } from 'next';
import { cacheLife, cacheTag } from 'next/cache';
import { getPayload } from 'payload';

/**
 *
 * Configures the manifest for the PWA
 *
 * @returns {MetadataRoute.Manifest} The manifest configuration for the PWA
 *
 * @see https://whatpwacando.today/ Capabilities of PWAs
 */
export const cachedManifestGenerator = async (): Promise<MetadataRoute.Manifest> => {
  'use cache';
  cacheLife('hours');
  cacheTag('payload', 'PWA-v12');

  console.log('[Manifest] Generating manifest...');
  const payload = await getPayload({ config });

  console.log('[Manifest] Fetching PWA globals...');
  const pwaGlobal = await payload.findGlobal({
    slug: 'PWA',
  });

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!pwaGlobal) {
    throw new Error('PWA global configuration not found');
  }

  const { appName, appShortName, appDescription } = pwaGlobal;
  return {
    name: appName,
    short_name: appShortName,
    description: appDescription,
    id: '/',
    start_url: environmentVariables.APP_HOST_URL + '/entrypoint?app-mode=true', // navigates to the app entrypoint on launch
    categories: ['kids', 'social', 'news'],
    //  it follows a pre-defined fallback chain: standalone → minimal-ui
    display: 'standalone',
    display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
    launch_handler: {
      client_mode: 'auto',
    },
    protocol_handlers: [
      {
        protocol: 'web+conveniat',
        url: '/entrypoint?app-mode=true&protocol=%s',
      },
    ],
    background_color: '#f8fafc',
    theme_color: '#FFF',
    icons: manifestIconDefinitions,
    screenshots: [
      {
        src: '/screenshots/main-screenshot.png',
        sizes: 'any',
        type: 'image/png',
        form_factor: 'wide',
      },
      {
        src: '/screenshots/main-screenshot.png',
        sizes: 'any',
        type: 'image/png',
        form_factor: 'narrow',
      },
    ],
    dir: 'ltr',
    lang: LOCALE.DE, // TODO: how to support multiple languages?
    orientation: 'portrait-primary',
    scope: '/',
    prefer_related_applications: false,
  };
};
