import { environmentVariables } from '@/config/environment-variables';
import { aboutUsContent } from '@/features/payload-cms/payload-cms/initialization/seeding/about-us';
import {
  createRandomCampAnnotation,
  generateCampSides,
  generatePlaygroundPolygons,
} from '@/features/payload-cms/payload-cms/initialization/seeding/camp-map';
import { contactPageContent } from '@/features/payload-cms/payload-cms/initialization/seeding/contact-page';
import { contactForm } from '@/features/payload-cms/payload-cms/initialization/seeding/form';
import { generateMainMenu } from '@/features/payload-cms/payload-cms/initialization/seeding/generate-main-menu';
import { internalPageContent } from '@/features/payload-cms/payload-cms/initialization/seeding/internal-page';
import { landingPageContent } from '@/features/payload-cms/payload-cms/initialization/seeding/landing-page';
import {
  seedPermissionAdminsOnly,
  seedPermissionLoggedIn,
  seedPermissionPublic,
} from '@/features/payload-cms/payload-cms/initialization/seeding/permissions';
import { createRandomUser } from '@/features/payload-cms/payload-cms/initialization/seeding/seed-users';
import { LOCALE } from '@/features/payload-cms/payload-cms/locales';
import { fakerDE as faker } from '@faker-js/faker';
import type { Payload } from 'payload';

/**
 * Seed the database with some initial data.
 * Seeding is only done if the database is empty and the environment is development.
 *
 * @param payload The Payload instance
 */
// eslint-disable-next-line complexity
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

  const { id: contactFormID } = await payload.create({
    collection: 'forms',
    data: structuredClone(contactForm),
  });

  // seed images
  const listOfImageUrls = [
    'https://www.cevi.ch/files/cevi/galerie/Konekta_2024/Konekta_5-min.jpg',
    'https://www.cevi.ch/files/cevi/galerie/Konekta_2024/Konekta_40-min.jpg',
    'https://www.cevi.ch/files/cevi/galerie/Konekta_2024/Konekta_11-min.jpg',
    // 'https://www.cevi.ch/files/cevi/galerie/Konekta_2024/Konekta_1-min.jpg',
    // 'https://www.cevi.ch/files/cevi/galerie/Konekta_2024/Konekta_17-min.jpg',
    // 'https://www.cevi.ch/files/cevi/galerie/Konekta_2024/Konekta_23-min.jpg',
    // 'https://www.cevi.ch/files/cevi/galerie/Konekta_2024/Konekta_18-min.jpg',
    // 'https://www.cevi.ch/files/cevi/galerie/Konekta_2024/Konekta_22-min.jpg',
    // 'https://www.cevi.ch/files/cevi/galerie/Konekta_2024/Konekta_25-min.jpg',
    // 'https://www.cevi.ch/files/cevi/galerie/Konekta_2024/Konekta_26-min.jpg',
    // 'https://www.cevi.ch/files/cevi/galerie/Konekta_2024/Konekta_14-min.jpg',
    // 'https://www.cevi.ch/files/cevi/galerie/Konekta_2024/Konekta_21-min.jpg',
  ];

  const imageIds: string[] = [];

  for (const imageUrl of listOfImageUrls) {
    const image = await fetch(imageUrl);

    const alt = faker.lorem.sentence({ min: 5, max: 8 });
    const caption = faker.lorem.sentence({ min: 5, max: 8 });

    const { id: imageID } = await payload.create({
      collection: 'images',
      data: {
        alt_de: alt,
        alt_en: alt,
        alt_fr: alt,
        updatedAt: '2025-01-01T01:00:00.000Z',
        createdAt: '2025-01-01T01:00:00.000Z',
        url: imageUrl,
        imageCaption_de: caption,
        imageCaption_en: caption,
        imageCaption_fr: caption,
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

  const publicPermission = await seedPermissionPublic(payload);
  await seedPermissionAdminsOnly(payload);
  const internalPermission = await seedPermissionLoggedIn(payload);

  const fileDownloadImageURL = listOfImageUrls[0] ?? '';
  const image = await fetch(fileDownloadImageURL);
  const imageBuffer = await image.arrayBuffer();
  const { id: fileDownloadId } = await payload.create({
    collection: 'documents',
    data: {
      updatedAt: '2025-01-01T01:00:00.000Z',
      createdAt: '2025-01-01T01:00:00.000Z',
      permissions: internalPermission,
    },
    file: {
      mimetype: 'image/jpeg',
      name: 'Konekta.jpg',
      size: imageBuffer.byteLength,
      data: Buffer.from(imageBuffer),
    },
  });

  const { id: landingPageId } = await payload.create({
    collection: 'generic-page',
    locale: LOCALE.DE,
    data: {
      ...landingPageContent(publicPermission),
      _locale: LOCALE.DE,
    },
  });

  await payload.update({
    collection: 'generic-page',
    id: landingPageId,
    locale: LOCALE.EN,
    data: {
      ...landingPageContent(publicPermission),
      _locale: LOCALE.EN,
    },
  });

  await payload.update({
    collection: 'generic-page',
    id: landingPageId,
    locale: LOCALE.FR,
    data: {
      ...landingPageContent(publicPermission),
      _locale: LOCALE.FR,
    },
  });

  const { id: contactPageId } = await payload.create({
    collection: 'generic-page',
    locale: LOCALE.DE,
    data: {
      ...contactPageContent(publicPermission, contactFormID),
      _locale: LOCALE.DE,
    },
  });

  const { id: aboutUsPageId } = await payload.create({
    collection: 'generic-page',
    locale: LOCALE.DE,
    data: {
      ...aboutUsContent(publicPermission, imageIds[0] ?? ''),
      _locale: LOCALE.DE,
    },
  });

  const { id: internalPageId } = await payload.create({
    collection: 'generic-page',
    locale: LOCALE.DE,
    data: {
      ...internalPageContent(internalPermission, fileDownloadId),
      _locale: LOCALE.DE,
    },
  });

  const mainMenu = generateMainMenu(contactPageId, aboutUsPageId, internalPageId);
  await payload.updateGlobal({
    slug: 'header',
    locale: LOCALE.DE,
    data: { mainMenu: mainMenu },
  });

  // seed app content
  for (let index = 0; index < 10; index++) {
    await payload.create({
      collection: 'camp-map-annotations',
      data: createRandomCampAnnotation(imageIds),
    });
  }

  const campSides = generateCampSides();
  for (const side of campSides) {
    await payload.create({
      collection: 'camp-map-annotations',
      data: side,
    });
  }

  const playGrounds = generatePlaygroundPolygons();
  for (const playground of playGrounds) {
    await payload.create({
      collection: 'camp-map-annotations',
      data: playground,
    });
  }

  // seed users
  for (let index = 0; index < 10; index++) {
    await createRandomUser(payload);
  }
};
