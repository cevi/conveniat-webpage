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

  lines.push(
    '# conveniat27 - MIR SIND CEVI',
    '',
    '> Mit dem Motto «MIR SIND CEVI» hat sich ein junges, dynamisches Team aus allen Regionen der Schweiz zusammengeschlossen. Gemeinsam gestalten wir vom 24. Juli bis zum 2. August 2027 ein Lager im Obergoms VS, das verbindet, inspiriert und zeigt, was Cevi ausmacht: Zusammenhalt, Freundschaft, Glaube und Abenteuer, die bleiben. Wir erwarten etwa 5000 Teilnehmende sowie hunderte Helfende. Die Leitenden schaffen für die Kinder und Jugendlichen ein nachhaltiges und prägendes Lagererlebnis. Mit dem Motto «Mir sind CEVI!» wird die Wichtigkeit des gesamten Cevis in all seinen Facetten repräsentiert.',
    '',
    '## Hauptseiten & Informationen',
    '',
    `- [Startseite](${APP_HOST_URL}/)`,
  );

  // Include special pages from specialPagesTable
  for (const [key, specialPage] of Object.entries(specialPagesTable)) {
    const title = specialPage.title.de || specialPage.title.en || key;
    const path = specialPage.alternatives.de || specialPage.alternatives.en || `/${key}`;
    lines.push(`- [${title}](${APP_HOST_URL}${path})`);
  }

  lines.push('', '## Veröffentlichte Seiten & Artikel', '');

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

      for (const document_ of docs) {
        const rawDocument = document_ as unknown as {
          title?: string;
          name?: string;
          id?: string | number;
          slug?: string;
          seo?: { urlSlug?: string };
        };
        const title = rawDocument.title || rawDocument.name || String(rawDocument.id ?? '');
        const slug = rawDocument.seo?.urlSlug || rawDocument.slug || '';
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
