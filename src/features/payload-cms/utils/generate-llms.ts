import { environmentVariables } from '@/config/environment-variables';
import { specialPagesTable } from '@/features/payload-cms/special-pages-table';
import config from '@payload-config';
import { cacheLife, cacheTag } from 'next/cache';
import type { CollectionSlug } from 'payload';
import { getPayload } from 'payload';

/**
 * Generates dynamic llms.txt content conforming to the llms.txt standard.
 * Includes H1 title, site summary, key special pages, and published CMS pages.
 */
export const cachedLlmsGenerator = async (): Promise<string> => {
  'use cache';
  cacheLife('hours');
  cacheTag('payload', 'generic-page', 'blog');

  const APP_HOST_URL = environmentVariables.APP_HOST_URL;
  const lines: string[] = [];

  lines.push('# conveniat27 - MIR SIND CEVI');
  lines.push('');
  lines.push(
    '> Das offizielle Webportal von conveniat27 – das Harzfest / Cevi Schweiz Grossanlass im Sommer 2027.',
  );
  lines.push('');
  lines.push('## Hauptseiten & Informationen');
  lines.push('');
  lines.push(`- [Startseite](${APP_HOST_URL}/)`);

  // Include special pages from specialPagesTable
  for (const [key, specialPage] of Object.entries(specialPagesTable)) {
    const title = specialPage.title.de || specialPage.title.en || key;
    const path = specialPage.alternatives.de || specialPage.alternatives.en || `/${key}`;
    lines.push(`- [${title}](${APP_HOST_URL}${path})`);
  }

  lines.push('');
  lines.push('## Veröffentlichte Seiten & Artikel');
  lines.push('');

  try {
    const payload = await getPayload({ config });
    const currentDate = new Date().toISOString();

    const collections = [
      { name: 'generic-page', prefix: '' },
      { name: 'blog', prefix: '/blog' },
    ];

    for (const { name, prefix } of collections) {
      const { docs } = await payload.find({
        collection: name as CollectionSlug,
        depth: 0,
        limit: 100,
        locale: 'de',
        where: {
          'content.releaseDate': {
            less_than_equal: currentDate,
          },
        },
      });

      for (const doc of docs) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rawDoc = doc as any;
        const title = rawDoc.title || rawDoc.name || rawDoc.id;
        const slug = rawDoc.seo?.urlSlug || rawDoc.slug || '';
        if (slug) {
          lines.push(`- [${title}](${APP_HOST_URL}${prefix}/${slug})`);
        }
      }
    }
  } catch (error) {
    console.error('Failed to fetch CMS pages for llms.txt:', error);
  }

  return lines.join('\n');
};
