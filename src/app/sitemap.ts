import { sitemapGenerator } from '@/features/payload-cms/utils/generate-sitemap';
import type { MetadataRoute } from 'next';
import { unstable_cache } from 'next/cache';
import { connection } from 'next/server';

const generateSitemap = async (): Promise<MetadataRoute.Sitemap> => {
  await connection(); // opt-out of static generation

  // cache the sitemap generation to avoid unnecessary re-fetching
  // we can revalidate the cache by using a key 'sitemap'
  return unstable_cache(async () => sitemapGenerator(), [], {
    revalidate: 7 * 24 * 60 * 60, // revalidate once a week
    tags: ['sitemap'],
  })();
};

export default generateSitemap;
