import { Payload } from 'payload';
import { lexicalPlaceholder } from '@/payload-cms/on-payload-init/seed-database/placeholder-lexical';
import { basicForm } from './all-types-form';
import { basicBlog } from './blog-post';
import { basicTimelineObject } from './timeline';
import { readFileSync } from 'node:fs';
/**
 * Seed the database with some initial data.
 * Seeding is only done if the database is empty and the environment is development.
 *
 * @param payload The Payload instance
 */
export const seedDatabase = async (payload: Payload): Promise<void> => {
  // we only seed for the dev instance
  if (process.env.NODE_ENV !== 'development') {
    console.log(`Skipping seeding for NODE_ENV=${process.env.NODE_ENV}`);
    return;
  }

  // check if a user exists
  const { totalDocs } = await payload.count({ collection: 'users' });
  if (totalDocs > 0) {
    console.log('User already exists, skipping seeding');
    return;
  }

  const { id: formID } = await payload.create({
    collection: 'forms',
    data: structuredClone(basicForm),
  });

  const imageBuffer = readFileSync('public/web-app-manifest-512x512.png');
  const { id: imageID } = await payload.create({
    collection: 'images',
    data: {
      alt: 'Alternative Text',
      updatedAt: '2025-01-01T01:00:00.000Z',
      createdAt: '2025-01-01T01:00:00.000Z',
    },
    file: {
      data: imageBuffer,
      mimetype: 'image/png',
      name: 'favicon.png',
      size: 96,
    },
  });

  await payload.create({
    collection: 'timeline',
    data: structuredClone(basicTimelineObject),
  });

  await payload.create({
    collection: 'blog',
    data: structuredClone(basicBlog(imageID)),
  });

  await payload.updateGlobal({
    slug: 'header',
    locale: 'de' as const,
    data: {
      mainMenu: [
        {
          label: 'Zeitstrahl',
          link: '/zeitstrahl',
        },
        {
          label: 'Impressum',
          link: '/impressum',
        },
      ],
    },
  });

  await payload.updateGlobal({
    slug: 'landingPage',
    locale: 'de' as const,
    data: {
      content: {
        pageTeaser:
          'Apparently we had reached a great height in the atmosphere, for the sky was a dead black, ' +
          'and the stars had ceased to twinkle. By the same illusion which lifts the horizon of the ' +
          'sea to the level of the spectato.',
        pageTitle: 'Conveniat 2027 - WIR SIND CEVI',
        callToAction: {
          link: '/',
          linkText: 'Call to Action',
        },
        mainContent: [
          {
            blockType: 'richTextSection' as const,
            richTextSection: lexicalPlaceholder,
          },
          {
            blockType: 'formBlock' as const,
            form: formID,
          },
          {
            blockType: 'blogPostsOverview' as const,
          },
          {
            blockType: 'youtubeEmbed' as const,
            link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          },
        ],
      },
      _locale: 'de' as const,
    },
  });

  const globalSlugs = ['imprint', 'data-privacy-statement'] as const;
  for (const slug of globalSlugs) {
    await payload.updateGlobal({
      slug,
      locale: 'de' as const,
      data: {
        content: {
          pageTitle: slug,
          mainContent: lexicalPlaceholder,
        },
        _locale: 'de' as const,
      },
    });
  }
};
