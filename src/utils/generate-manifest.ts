import type { MetadataRoute } from 'next';
import { getPayload } from 'payload';
import config from '@payload-config';
import { manifestIconDefinitions } from '@/utils/icon-definitions';

/**
 *
 * Configures the manifest for the PWA
 *
 * @returns {MetadataRoute.Manifest} The manifest configuration for the PWA
 *
 * @see https://whatpwacando.today/ Capabilities of PWAs
 */
export const generateManifest = async (): Promise<MetadataRoute.Manifest> => {
  const payload = await getPayload({ config });

  const { appName, appShortName, appDescription } = await payload.findGlobal({
    slug: 'PWA',
  });

  return {
    name: appName,
    short_name: appShortName,
    description: appDescription,
    id: 'https://conveniat27.ch', // TODO: remove hard-coded domain
    start_url: './?app-mode=true', // TODO: remove hard-coded domain
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
    lang: 'de', // TODO: how to support multiple languages?
    orientation: 'portrait-primary',
    scope: 'https://conveniat27.ch/', // TODO: remove hard-coded domain
    prefer_related_applications: false,
  };
};
