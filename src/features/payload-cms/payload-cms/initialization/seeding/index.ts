import { environmentVariables } from '@/config/environment-variables';
import { basicForm } from '@/features/payload-cms/payload-cms/initialization/seeding/all-types-form';
import { basicBlog } from '@/features/payload-cms/payload-cms/initialization/seeding/blog-post';
import {
  seedPermissionAdminsOnly,
  seedPermissionLoggedIn,
  seedPermissionPublic,
} from '@/features/payload-cms/payload-cms/initialization/seeding/permissions';
import { generateRichTextSection } from '@/features/payload-cms/payload-cms/initialization/seeding/placeholder-lexical';
import { basicTimelineObject } from '@/features/payload-cms/payload-cms/initialization/seeding/timeline';
import { LOCALE } from '@/features/payload-cms/payload-cms/locales';
import { fakerDE as faker } from '@faker-js/faker';
import type { Payload, RequiredDataFromCollectionSlug } from 'payload';

/**
 * Seed the database with some initial data.
 * Seeding is only done if the database is empty and the environment is development.
 *
 * @param payload The Payload instance
 */
export const seedDatabase = async (payload: Payload): Promise<void> => {
  // we only seed for the dev instance
  if (environmentVariables.NODE_ENV !== 'development') {
    console.log(`Skipping seeding for NODE_ENV=${environmentVariables.NODE_ENV}`);
    return;
  }

  // check if a user exists
  const { totalDocs } = await payload.count({ collection: 'users' });
  if (totalDocs > 0) {
    console.log('User already exists, skipping seeding');
    return;
  }

  // check if generic-page exists
  const { totalDocs: genericPageCount } = await payload.count({
    collection: 'generic-page',
  });
  if (genericPageCount > 0) {
    console.log('Generic page already exists, skipping seeding');
    return;
  }

  const { id: formID } = await payload.create({
    collection: 'forms',
    data: structuredClone(basicForm),
  });

  // seed images
  const listOfImageUrls = [
    'https://www.cevi.ch/files/cevi/galerie/Konekta_2024/Konekta_5-min.jpg',
    'https://www.cevi.ch/files/cevi/galerie/Konekta_2024/Konekta_40-min.jpg',
    'https://www.cevi.ch/files/cevi/galerie/Konekta_2024/Konekta_11-min.jpg',
    'https://www.cevi.ch/files/cevi/galerie/Konekta_2024/Konekta_1-min.jpg',
    'https://www.cevi.ch/files/cevi/galerie/Konekta_2024/Konekta_17-min.jpg',
    'https://www.cevi.ch/files/cevi/galerie/Konekta_2024/Konekta_23-min.jpg',
    'https://www.cevi.ch/files/cevi/galerie/Konekta_2024/Konekta_18-min.jpg',
    'https://www.cevi.ch/files/cevi/galerie/Konekta_2024/Konekta_22-min.jpg',
    'https://www.cevi.ch/files/cevi/galerie/Konekta_2024/Konekta_25-min.jpg',
    'https://www.cevi.ch/files/cevi/galerie/Konekta_2024/Konekta_26-min.jpg',
    'https://www.cevi.ch/files/cevi/galerie/Konekta_2024/Konekta_14-min.jpg',
    'https://www.cevi.ch/files/cevi/galerie/Konekta_2024/Konekta_21-min.jpg',
  ];

  const imageIds: string[] = [];

  for (const imageUrl of listOfImageUrls) {
    const image = await fetch(imageUrl);

    const { id: imageID } = await payload.create({
      collection: 'images',
      data: {
        alt: faker.lorem.sentence({ min: 5, max: 8 }),
        updatedAt: '2025-01-01T01:00:00.000Z',
        createdAt: '2025-01-01T01:00:00.000Z',
        url: imageUrl,
        imageCaption: faker.lorem.sentence({ min: 4, max: 6 }),
      },
      file: {
        data: Buffer.from(await image.arrayBuffer()),
        mimetype: 'image/jpeg',
        name: 'image.jpg',
        size: 0,
      },
    });

    imageIds.push(imageID);
  }

  await payload.create({
    collection: 'timeline',
    data: structuredClone(basicTimelineObject),
  });

  const public_permission = await seedPermissionPublic(payload);
  await seedPermissionAdminsOnly(payload);
  await seedPermissionLoggedIn(payload);

  const blockCount = 20;
  for (let index = 0; index < blockCount; index++) {
    const imageId = imageIds[index % imageIds.length];
    if (imageId === undefined) {
      throw new Error('Could not find image ID');
    }

    await payload.create({
      collection: 'blog',
      data: structuredClone(basicBlog(imageId, imageIds, public_permission.id)),
    });
  }

  await payload.updateGlobal({
    slug: 'header',
    locale: LOCALE.DE,
    data: {
      mainMenu: [
        {
          label: 'Zeitstrahl',
          link: '/zeitstrahl',
        },
      ],
    },
  });

  const landingPageContent: RequiredDataFromCollectionSlug<'generic-page'> = {
    internalPageName: 'startseite',
    authors: [],
    internalStatus: 'approved',
    _disable_unpublishing: true,
    _status: 'published',
    content: {
      pageTitle: 'conveniat27 - WIR SIND CEVI',
      releaseDate: '2025-01-01T01:00:00.000Z',
      permissions: public_permission.id,
      mainContent: [
        {
          blockType: 'heroSection' as const,
          pageTeaser:
            'Im Jahr 2009 hat im Jura das erste und bisher einzige nationale Zeltlager des Cevi Schweiz stattgefunden. ' +
            'Fast 4000 junge Menschen aus der gesamten Schweiz sind zusammengekommen, um die verschiedenen Facetten des ' +
            'Cevi zu feiern und gemeinsam eine grossartige Zeit zu haben. Neben unvergänglichen Erinnerungen wurden viele ' +
            'Freundschaften über alle Landesteile hinweg geschlossen und die nationale Identität des Cevi gestärkt sowie ' +
            'die grundlegenden sozialen und christlich geprägten Werte gepflegt.',
          callToAction: {
            linkLabel: 'Mehr erfahren',
            link: '/zeitstrahl',
          },
        },
        {
          blockType: 'richTextSection' as const,
          richTextSection: generateRichTextSection(),
        },
        {
          blockType: 'photoCarousel',
          images: faker.helpers.shuffle(imageIds).slice(0, faker.number.int({ min: 5, max: 8 })),
        },
        {
          blockType: 'richTextSection' as const,
          richTextSection: generateRichTextSection(),
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
          links: [
            {
              link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            },
          ],
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
    _locale: LOCALE.DE,
  };

  const landingPage = await payload.create({
    collection: 'generic-page',
    locale: LOCALE.DE,
    data: {
      ...landingPageContent,
      _locale: LOCALE.DE,
    },
  });

  await payload.update({
    collection: 'generic-page',
    id: landingPage.id,
    locale: LOCALE.EN,
    data: {
      ...landingPageContent,
      _locale: LOCALE.EN,
    },
  });

  await payload.update({
    collection: 'generic-page',
    id: landingPage.id,
    locale: LOCALE.FR,
    data: {
      ...landingPageContent,
      _locale: LOCALE.FR,
    },
  });
};
