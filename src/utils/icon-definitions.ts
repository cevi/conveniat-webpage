import type { Metadata, MetadataRoute } from 'next';

const iconsDefinitions: {
  src: string;
  sizes: string;
  type: string;
  purpose?: 'any' | 'maskable' | 'monochrome';
}[] = [
  {
    src: '/web-app-manifest-192x192.png',
    sizes: '192x192',
    type: 'image/png',
    purpose: 'any',
  },
  {
    src: '/web-app-manifest-512x512.png',
    sizes: '512x512',
    type: 'image/png',
    purpose: 'any',
  },
  {
    src: '/apple-touch-icon.png',
    sizes: '180x180',
    type: 'image/png',
  },
];

/**
 * The icon definitions for the manifest.webmanifest
 */
export const manifestIconDefinitions: NonNullable<MetadataRoute.Manifest['icons']> =
  iconsDefinitions;

/**
 * The icon definitions for the html metadata icons
 */
export const metadataIconDefinitions: NonNullable<Metadata['icons']> = iconsDefinitions.map(
  ({ src, ...icon }) => {
    return {
      ...icon,
      url: src,
    };
  },
);
