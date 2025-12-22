import { environmentVariables } from '@/config/environment-variables';
import { aboutUsContent } from '@/features/payload-cms/payload-cms/initialization/seeding/about-us';
import {
  createRandomCampAnnotation,
  generateCampSites,
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
import { generateScheduleEntries } from '@/features/payload-cms/payload-cms/initialization/seeding/schedule-entries';
import { createRandomUser } from '@/features/payload-cms/payload-cms/initialization/seeding/seed-users';
import { LOCALE } from '@/features/payload-cms/payload-cms/locales';
import { fakerDE as faker } from '@faker-js/faker';
import { revalidateTag } from 'next/cache';
import dns from 'node:dns';
import type { Payload } from 'payload';

// Force IPv4 to avoid Docker IPv6 timeouts
dns.setDefaultResultOrder('ipv4first');

const checkInternetConnection = async (): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeout = 3000;
    const id = setTimeout(() => controller.abort(), timeout);

    const response = await Promise.race([
      fetch('https://www.google.com', { signal: controller.signal }),
      new Promise<Response>((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout)),
    ]);

    clearTimeout(id);
    return response.ok;
  } catch {
    return false;
  }
};

const fetchWithTimeout = async (url: string, timeout = 5000): Promise<Response> => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

const getFallbackImageBuffer = (): Buffer => {
  // 1x1 pixel transparent GIF
  return Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
};

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

  console.log('Seeding: Checking internet connectivity...');
  const isOnline = await checkInternetConnection();
  if (isOnline) {
    console.log('Seeding: Internet connection confirmed.');
  } else {
    console.warn('Seeding: No internet connection detected. Seeding will usage fallback images.');
  }

  console.log('Seeding: Starting seeding process...');

  // check if a user exists
  const { totalDocs } = await payload.count({ collection: 'users' });
  if (totalDocs > 0) {
    console.log('User already exists, skipping seeding');
    return;
  }
  console.log('Seeding: No users found, proceeding...');

  // check if generic-page exists
  const { totalDocs: genericPageCount } = await payload.count({
    collection: 'generic-page',
  });
  if (genericPageCount > 0) {
    console.log('Generic page already exists, skipping seeding');
    return;
  }
  console.log('Seeding: No generic pages found, proceeding...');

  console.log('Seeding: Creating contact form...');

  const { id: contactFormID } = await payload.create({
    collection: 'forms',
    data: structuredClone(contactForm),
    context: { disableRevalidation: true },
  });

  // seed images
  console.log('Seeding: Fetching and creating images...');
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
    let imageBuffer: Buffer;

    try {
      if (isOnline) {
        const image = await fetchWithTimeout(imageUrl, 5000);
        if (!image.ok) {
          throw new Error(`Failed to fetch image (status ${image.status})`);
        }
        const arrayBuffer = await image.arrayBuffer();
        imageBuffer = Buffer.from(arrayBuffer);
      } else {
        throw new Error('Offline mode');
      }
    } catch {
      imageBuffer = getFallbackImageBuffer();
    }

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
        data: imageBuffer,
        mimetype: 'image/jpeg',
        name: 'image.jpg',
        size: imageBuffer.byteLength,
      },
      context: { disableRevalidation: true },
    });

    imageIds.push(imageID);
  }
  console.log('Seeding: Images created.');

  console.log('Seeding: Setting up permissions...');

  const publicPermission = await seedPermissionPublic(payload);
  await seedPermissionAdminsOnly(payload);
  const internalPermission = await seedPermissionLoggedIn(payload);
  console.log('Seeding: Permissions set.');

  console.log('Seeding: Creating initial documents and pages...');

  const fileDownloadImageURL = listOfImageUrls[0] ?? '';
  let documentImageBuffer: Buffer;
  try {
    if (isOnline) {
      const image = await fetchWithTimeout(fileDownloadImageURL, 5000);
      if (!image.ok) throw new Error('Fetch failed');
      const buffer = await image.arrayBuffer();
      documentImageBuffer = Buffer.from(buffer);
    } else {
      throw new Error('Offline');
    }
  } catch {
    documentImageBuffer = getFallbackImageBuffer();
  }

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
      size: documentImageBuffer.byteLength,
      data: documentImageBuffer,
    },
    context: { disableRevalidation: true },
  });

  const { id: landingPageId } = await payload.create({
    collection: 'generic-page',
    locale: LOCALE.DE,
    data: {
      ...landingPageContent(publicPermission),
      _locale: LOCALE.DE,
    },
    context: { disableRevalidation: true },
  });

  await payload.update({
    collection: 'generic-page',
    id: landingPageId,
    locale: LOCALE.EN,
    data: {
      ...landingPageContent(publicPermission),
      _locale: LOCALE.EN,
    },
    context: { disableRevalidation: true },
  });

  await payload.update({
    collection: 'generic-page',
    id: landingPageId,
    locale: LOCALE.FR,
    data: {
      ...landingPageContent(publicPermission),
      _locale: LOCALE.FR,
    },
    context: { disableRevalidation: true },
  });

  const { id: contactPageId } = await payload.create({
    collection: 'generic-page',
    locale: LOCALE.DE,
    data: {
      ...contactPageContent(publicPermission, contactFormID),
      _locale: LOCALE.DE,
    },
    context: { disableRevalidation: true },
  });

  const { id: aboutUsPageId } = await payload.create({
    collection: 'generic-page',
    locale: LOCALE.DE,
    data: {
      ...aboutUsContent(publicPermission, imageIds[0] ?? ''),
      _locale: LOCALE.DE,
    },
    context: { disableRevalidation: true },
  });

  const { id: internalPageId } = await payload.create({
    collection: 'generic-page',
    locale: LOCALE.DE,
    data: {
      ...internalPageContent(internalPermission, fileDownloadId),
      _locale: LOCALE.DE,
    },
    context: { disableRevalidation: true },
  });

  const mainMenu = generateMainMenu(contactPageId, aboutUsPageId, internalPageId);
  await payload.updateGlobal({
    slug: 'header',
    locale: LOCALE.DE,
    data: {
      mainMenu: mainMenu,
      _disable_unpublishing: true,
      _locale: LOCALE.DE,
      _localized_status: { published: true },
    },
    context: { disableRevalidation: true },
  });
  console.log('Seeding: Generic pages created.');

  console.log('Seeding: Creating app content (camp map)...');

  // seed app content
  for (let index = 0; index < 10; index++) {
    await payload.create({
      collection: 'camp-map-annotations',
      data: createRandomCampAnnotation(imageIds),
      context: { disableRevalidation: true },
    });
  }

  const campSites = generateCampSites();
  const campSitesIds = [];

  for (const side of campSites) {
    const { id: campSiteId } = await payload.create({
      collection: 'camp-map-annotations',
      data: side,
      context: { disableRevalidation: true },
    });
    campSitesIds.push(campSiteId);
  }

  const playGrounds = generatePlaygroundPolygons();
  for (const playground of playGrounds) {
    await payload.create({
      collection: 'camp-map-annotations',
      data: playground,
      context: { disableRevalidation: true },
    });
  }
  console.log('Seeding: Camp map creation done.');

  // seed users
  console.log('Seeding: Creating users...');
  const userIds = [];
  for (let index = 0; index < 10; index++) {
    userIds.push(await createRandomUser(payload));
  }
  console.log('Seeding: Users created.');

  // schedule entries
  console.log('Seeding: Creating schedule entries...');
  const scheduleEntries = generateScheduleEntries(campSitesIds, userIds);
  for (const scheduleEntry of scheduleEntries) {
    await payload.create({
      collection: 'camp-schedule-entry',
      data: scheduleEntry,
      context: { disableRevalidation: true },
    });
  }
  console.log('Seeding: Schedule entries created. Seeding complete.');

  console.log('Seeding: Flushing cache...');
  try {
    revalidateTag('payload', 'max');
    console.log('Seeding: Cache flushed.');
  } catch {
    console.warn('Seeding: Cache flush failed (non-critical).');
  }
};
