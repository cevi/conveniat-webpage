import type { MetadataRoute } from 'next';

export const generateRobots = (): MetadataRoute.Robots => {
  const NEXT_PUBLIC_APP_HOST_URL = process.env['NEXT_PUBLIC_APP_HOST_URL'] ?? '';

  // prevent web crawlers from indexing the dev page
  if (NEXT_PUBLIC_APP_HOST_URL !== 'https://conveniat27.ch') {
    return {
      rules: {
        userAgent: '*',
        disallow: '/',
      },
    };
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/admin/',
    },
    sitemap: NEXT_PUBLIC_APP_HOST_URL + '/sitemap.xml',
  };
};
