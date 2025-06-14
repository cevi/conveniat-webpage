import { manifestGenerator } from '@/utils/generate-manifest';
import type { MetadataRoute } from 'next';
import { unstable_cache } from 'next/cache';
import { connection } from 'next/server';

const generateManifest = async (): Promise<MetadataRoute.Manifest> => {
  await connection(); // opt-out of static generation

  // cache the sitemap generation to avoid unnecessary re-fetching
  // we can revalidate the cache by using a key 'manifest'
  return unstable_cache(async () => manifestGenerator(), [], {
    revalidate: 7 * 24 * 60 * 60, // revalidate once a week
    tags: ['manifest'],
  })();
};

export default generateManifest;
