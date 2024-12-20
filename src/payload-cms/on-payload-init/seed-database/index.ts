import { Payload } from 'payload';
import { lexicalPlaceholder } from '@/payload-cms/on-payload-init/seed-database/placeholder-lexical';

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

  await payload.updateGlobal({
    slug: 'landingPage',
    locale: 'de-CH' as const,
    data: {
      content: {
        pageTitle: 'Conveniat 2027 - WIR SIND CEVI',
        mainContent: [
          {
            blockType: 'article' as const,
            pageContent: lexicalPlaceholder,
          },
          {
            blockType: 'blogPostsOverview' as const,
          },
        ],
      },
      _locale: 'de-CH' as const,
    },
  });

  const globalSlugs = ['imprint', 'data-privacy-statement'] as const;
  for (const slug of globalSlugs) {
    await payload.updateGlobal({
      slug,
      locale: 'de-CH' as const,
      data: {
        content: {
          pageTitle: slug,
          mainContent: lexicalPlaceholder,
        },
        _locale: 'de-CH' as const,
      },
    });
  }
};
