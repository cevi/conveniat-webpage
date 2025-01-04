import type { MetadataRoute } from 'next';

export const generateRobots = (): MetadataRoute.Robots => {
  const APP_HOST_URL = process.env['APP_HOST_URL'] ?? '';
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/admin/',
    },
    sitemap: APP_HOST_URL + '/sitemap.xml',
  };
};
