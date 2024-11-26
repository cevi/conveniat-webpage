import type { MetadataRoute } from 'next';

export const generateRobots = (): MetadataRoute.Robots => {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/admin/',
    },
    sitemap: '/sitemap.xml',
  };
};
