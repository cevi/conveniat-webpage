import { cachedSitemapGenerator } from '@/features/payload-cms/utils/generate-sitemap';
import { isBuildTimePreRendering } from '@/utils/is-pre-rendering';
import type { MetadataRoute } from 'next';

const generateSitemap = async (): Promise<MetadataRoute.Sitemap> => {
  if (await isBuildTimePreRendering()) return []; // bail out, don't cache anything at build time
  return cachedSitemapGenerator();
};

export default generateSitemap;
