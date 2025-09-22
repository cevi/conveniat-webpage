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
  cacheTag('payload', 'PWA');

  const payload = await getPayload({ config });

  const { appName, appShortName, appDescription } = await payload.findGlobal({
    slug: 'PWA',
  });

  const APP_HOST_URL = environmentVariables.APP_HOST_URL;

  return {
    name: appName,
    short_name: appShortName,
    description: appDescription,
    id: APP_HOST_URL,
    start_url: '/entrypoint', // navigates to the app entrypoint on launch
    categories: ['kids', 'social', 'news'],
    //  it follows a pre-defined fallback chain: standalone → minimal-ui
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    launch_handler: {
      client_mode: 'auto',
    },
    background_color: '#f8fafc',
    theme_color: '#FFF',
    icons: manifestIconDefinitions,
    dir: 'ltr',
    lang: LOCALE.DE, // TODO: how to support multiple languages?
    orientation: 'portrait-primary',
    scope: '/',
    prefer_related_applications: false,
  };
};
