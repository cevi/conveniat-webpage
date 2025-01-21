import { Payload, RequiredDataFromCollectionSlug } from 'payload';
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

  const landingPageContent: RequiredDataFromCollectionSlug<'generic-page'> = {
    content: {
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
    seo: {
      urlSlug: '',
      metaTitle: 'conveniat27',
      metaDescription: 'conveniat27',
      keywords: '',
    },
    _localized_status: {
      published: true,
    },
    _locale: 'de' as const,
  };

  const landingPage = await payload.create({
    collection: 'generic-page',
    locale: 'de' as const,
    data: {
      ...landingPageContent,
      _locale: 'de' as const,
    },
  });

  await payload.update({
    collection: 'generic-page',
    id: landingPage.id,
    locale: 'en' as const,
    data: {
      ...landingPageContent,
      _locale: 'en' as const,
    },
  });

  await payload.update({
    collection: 'generic-page',
    id: landingPage.id,
    locale: 'fr' as const,
    data: {
      ...landingPageContent,
      _locale: 'fr' as const,
    },
  });
};
