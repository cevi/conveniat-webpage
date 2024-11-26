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
    start_url: '/',
    display: 'fullscreen',
    background_color: '#fff',
    theme_color: '#fff',
    icons: manifestIconDefinitions,
    dir: 'ltr',
    orientation: 'portrait',
    prefer_related_applications: false,
  };
};
