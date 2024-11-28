import type { MetadataRoute } from 'next';

export const generateRobots = (): MetadataRoute.Robots => {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/admin/',
    },
    // TODO: remove hard-coded domain
    sitemap: 'https://test.conveniat27.cevi.tools/sitemap.xml',
  };
};
