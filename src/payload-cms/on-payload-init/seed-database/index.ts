import { Payload } from 'payload';
import { lexicalPlaceholder } from '@/payload-cms/on-payload-init/seed-database/placeholder-lexical';
import { basicForm } from './all-types-form';

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
