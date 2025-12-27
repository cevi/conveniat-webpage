import { environmentVariables } from '@/config/environment-variables';
import { aboutUsContent } from '@/features/payload-cms/payload-cms/initialization/seeding/about-us';
import {
  generateBlogArticles,
  getLocalizedBlogContent,
} from '@/features/payload-cms/payload-cms/initialization/seeding/blog-articles';
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
import {
  type CategoryIds,
  generateScheduleEntries,
} from '@/features/payload-cms/payload-cms/initialization/seeding/schedule-entries';
import { seedAlertSettings } from '@/features/payload-cms/payload-cms/initialization/seeding/seed-alert-settings';
import { createRandomUser } from '@/features/payload-cms/payload-cms/initialization/seeding/seed-users';
import {
  generateTimelineEntries,
  getLocalizedTimelineContent,
} from '@/features/payload-cms/payload-cms/initialization/seeding/timeline';
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

const getFallbackImageBuffer = async (): Promise<Buffer> => {
  /*
   * 360x240 PNG
   */
  const svg = `
  <svg width="360" height="240" viewBox="0 0 360 240" xmlns="http://www.w3.org/2000/svg">
    <rect width="360" height="240" fill="#cccccc" />
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="monospace" font-size="24" fill="#333333">360x240</text>
  </svg>
  `;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  const { default: sharp } = await import('sharp');
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
  return await sharp(Buffer.from(svg)).toFormat('png').toBuffer();
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

  // Create Contact Form (DE is default)
  const { id: contactFormID } = await payload.create({
    collection: 'forms',
    data: structuredClone(contactForm),
    locale: LOCALE.DE,
    context: { disableRevalidation: true, validate: false },
  });

  // Localize Contact Form for EN
  const contactFormEN = structuredClone(contactForm);
  contactFormEN.title = 'Contact Form';
  contactFormEN.submitButtonLabel = 'Submit';

  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  contactFormEN.confirmationMessage.root.children[0].children[0].text =
    'The form was submitted successfully.';
  if (contactFormEN.emails?.[0]) {
    contactFormEN.emails[0].subject = 'New Request';
  }

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/prefer-optional-chain
  if (contactFormEN.sections?.[0]?.formSection.fields) {
    contactFormEN.sections[0].formSection.sectionTitle = 'Contact Details';
    const fields = contactFormEN.sections[0].formSection.fields;
    // Name
    // @ts-ignore
    if (fields[0]) fields[0].label = 'My Name';
    // Email
    // @ts-ignore
    if (fields[1]) fields[1].label = 'Email';
  }
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/prefer-optional-chain
  if (contactFormEN.sections?.[1]?.formSection.fields) {
    contactFormEN.sections[1].formSection.sectionTitle = 'Message';
    const fields = contactFormEN.sections[1].formSection.fields;
    // Checkbox
    // @ts-ignore
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (fields[0]) fields[0].label.root.children[0].children[0].text = 'I am in.';
    // Comment
    // @ts-ignore
    if (fields[1]) fields[1].label = 'Comment';
  }

  await payload.update({
    collection: 'forms',
    id: contactFormID,
    locale: LOCALE.EN,
    data: contactFormEN,
    context: { disableRevalidation: true, validate: false },
  });

  // Localize Contact Form for FR
  const contactFormFR = structuredClone(contactForm);
  contactFormFR.title = 'Formulaire de contact';
  contactFormFR.submitButtonLabel = 'Envoyer';
  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  contactFormFR.confirmationMessage.root.children[0].children[0].text =
    'Le formulaire a été envoyé avec succès.';
  if (contactFormFR.emails?.[0]) {
    contactFormFR.emails[0].subject = 'Nouvelle demande';
  }

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/prefer-optional-chain
  if (contactFormFR.sections?.[0]?.formSection.fields) {
    contactFormFR.sections[0].formSection.sectionTitle = 'Détails du contact';
    const fields = contactFormFR.sections[0].formSection.fields;
    // Name
    // @ts-ignore
    if (fields[0]) fields[0].label = 'Mon Nom';
    // Email
    // @ts-ignore
    if (fields[1]) fields[1].label = 'Email';
  }
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/prefer-optional-chain
  if (contactFormFR.sections?.[1]?.formSection.fields) {
    contactFormFR.sections[1].formSection.sectionTitle = 'Message';
    const fields = contactFormFR.sections[1].formSection.fields;
    // Checkbox
    // @ts-ignore
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (fields[0]) fields[0].label.root.children[0].children[0].text = 'Je participe.';
    // Comment
    // @ts-ignore
    if (fields[1]) fields[1].label = 'Commentaire';
  }

  await payload.update({
    collection: 'forms',
    id: contactFormID,
    locale: LOCALE.FR,
    data: contactFormFR,
    context: { disableRevalidation: true, validate: false },
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
      imageBuffer = await getFallbackImageBuffer();
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
    documentImageBuffer = await getFallbackImageBuffer();
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

  // Create Subpages first (Contact, About Us, Internal)
  const { id: contactPageId } = await payload.create({
    collection: 'generic-page',
    locale: LOCALE.DE,
    data: {
      ...contactPageContent(publicPermission, contactFormID, LOCALE.DE),
      _locale: LOCALE.DE,
    },
    context: { disableRevalidation: true },
  });

  await payload.update({
    collection: 'generic-page',
    id: contactPageId,
    locale: LOCALE.EN,
    data: {
      ...contactPageContent(publicPermission, contactFormID, LOCALE.EN),
      _locale: LOCALE.EN,
    },
    context: { disableRevalidation: true },
  });

  await payload.update({
    collection: 'generic-page',
    id: contactPageId,
    locale: LOCALE.FR,
    data: {
      ...contactPageContent(publicPermission, contactFormID, LOCALE.FR),
      _locale: LOCALE.FR,
    },
    context: { disableRevalidation: true },
  });

  const { id: aboutUsPageId } = await payload.create({
    collection: 'generic-page',
    locale: LOCALE.DE,
    data: {
      ...aboutUsContent(publicPermission, imageIds[0] ?? '', LOCALE.DE),
      _locale: LOCALE.DE,
    },
    context: { disableRevalidation: true },
  });

  await payload.update({
    collection: 'generic-page',
    id: aboutUsPageId,
    locale: LOCALE.EN,
    data: {
      ...aboutUsContent(publicPermission, imageIds[0] ?? '', LOCALE.EN),
      _locale: LOCALE.EN,
    },
    context: { disableRevalidation: true },
  });

  await payload.update({
    collection: 'generic-page',
    id: aboutUsPageId,
    locale: LOCALE.FR,
    data: {
      ...aboutUsContent(publicPermission, imageIds[0] ?? '', LOCALE.FR),
      _locale: LOCALE.FR,
    },
    context: { disableRevalidation: true },
  });

  const { id: internalPageId } = await payload.create({
    collection: 'generic-page',
    locale: LOCALE.DE,
    data: {
      ...internalPageContent(internalPermission, fileDownloadId, LOCALE.DE),
      _locale: LOCALE.DE,
    },
    context: { disableRevalidation: true },
  });

  await payload.update({
    collection: 'generic-page',
    id: internalPageId,
    locale: LOCALE.EN,
    data: {
      ...internalPageContent(internalPermission, fileDownloadId, LOCALE.EN),
      _locale: LOCALE.EN,
    },
    context: { disableRevalidation: true },
  });

  await payload.update({
    collection: 'generic-page',
    id: internalPageId,
    locale: LOCALE.FR,
    data: {
      ...internalPageContent(internalPermission, fileDownloadId, LOCALE.FR),
      _locale: LOCALE.FR,
    },
    context: { disableRevalidation: true },
  });

  // Create Landing Page with links to subpages
  const subpageIds = {
    contact: contactPageId,
    aboutUs: aboutUsPageId,
    internal: internalPageId,
  };

  const { id: landingPageId } = await payload.create({
    collection: 'generic-page',
    locale: LOCALE.DE,
    data: {
      ...landingPageContent(publicPermission, LOCALE.DE, subpageIds),
      _locale: LOCALE.DE,
    },
    context: { disableRevalidation: true },
  });

  await payload.update({
    collection: 'generic-page',
    id: landingPageId,
    locale: LOCALE.EN,
    data: {
      ...landingPageContent(publicPermission, LOCALE.EN, subpageIds),
      _locale: LOCALE.EN,
    },
    context: { disableRevalidation: true },
  });

  await payload.update({
    collection: 'generic-page',
    id: landingPageId,
    locale: LOCALE.FR,
    data: {
      ...landingPageContent(publicPermission, LOCALE.FR, subpageIds),
      _locale: LOCALE.FR,
    },
    context: { disableRevalidation: true },
  });

  // seed users
  console.log('Seeding: Creating users...');
  const userIds = [];
  for (let index = 0; index < 10; index++) {
    userIds.push(await createRandomUser(payload));
  }
  console.log('Seeding: Users created.');

  // seed blog articles
  console.log('Seeding: Creating blog articles...');
  const blogArticles = generateBlogArticles(publicPermission, userIds[0] ?? '', imageIds[0] ?? '');
  for (const article of blogArticles) {
    const { id: articleId } = await payload.create({
      collection: 'blog',
      locale: LOCALE.DE,
      data: article,
      context: { disableRevalidation: true },
    });

    const enContent = getLocalizedBlogContent(LOCALE.EN, 'willkommen-beim-cevi', imageIds[0] ?? '');
    if (Object.keys(enContent).length > 0) {
      await payload.update({
        collection: 'blog',
        id: articleId,
        locale: LOCALE.EN,
        data: enContent,
        context: { disableRevalidation: true },
      });
    }

    const frContent = getLocalizedBlogContent(LOCALE.FR, 'willkommen-beim-cevi', imageIds[0] ?? '');
    if (Object.keys(frContent).length > 0) {
      await payload.update({
        collection: 'blog',
        id: articleId,
        locale: LOCALE.FR,
        data: frContent,
        context: { disableRevalidation: true },
      });
    }
  }

  // seed timeline
  console.log('Seeding: Creating timeline entries...');
  const timelineEntries = generateTimelineEntries();
  for (const entry of timelineEntries) {
    const { id: entryId } = await payload.create({
      collection: 'timeline',
      locale: LOCALE.DE,
      data: entry,
      context: { disableRevalidation: true },
    });

    const enContent = getLocalizedTimelineContent(LOCALE.EN, 'Lagerstart 2027');
    if (Object.keys(enContent).length > 0) {
      await payload.update({
        collection: 'timeline',
        id: entryId,
        locale: LOCALE.EN,
        data: enContent,
        context: { disableRevalidation: true },
      });
    }

    const frContent = getLocalizedTimelineContent(LOCALE.FR, 'Lagerstart 2027');
    if (Object.keys(frContent).length > 0) {
      await payload.update({
        collection: 'timeline',
        id: entryId,
        locale: LOCALE.FR,
        data: frContent,
        context: { disableRevalidation: true },
      });
    }
  }

  const mainMenu = generateMainMenu(contactPageId, aboutUsPageId, internalPageId);
  await payload.updateGlobal({
    slug: 'header',
    locale: LOCALE.DE,
    data: {
      mainMenu: mainMenu,
      _locale: LOCALE.DE,
      _localized_status: { published: true },
    },
    context: { disableRevalidation: true },
  });

  await seedAlertSettings(payload);

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

  // schedule categories
  console.log('Seeding: Creating schedule categories...');
  const categoryDefinitions: Array<{
    key: keyof CategoryIds;
    title_de: string;
    title_en: string;
    title_fr: string;
    colorTheme:
      | 'purple'
      | 'green'
      | 'blue'
      | 'gray'
      | 'indigo'
      | 'amber'
      | 'rose'
      | 'cyan'
      | 'orange';
  }> = [
    {
      key: 'workshop',
      title_de: 'Workshop',
      title_en: 'Workshop',
      title_fr: 'Atelier',
      colorTheme: 'purple',
    },
    {
      key: 'general',
      title_de: 'Allgemein',
      title_en: 'General',
      title_fr: 'Général',
      colorTheme: 'gray',
    },
    {
      key: 'food',
      title_de: 'Essen',
      title_en: 'Food',
      title_fr: 'Nourriture',
      colorTheme: 'orange',
    },
    {
      key: 'activity',
      title_de: 'Aktivität',
      title_en: 'Activity',
      title_fr: 'Activité',
      colorTheme: 'green',
    },
    {
      key: 'other',
      title_de: 'Sonstiges',
      title_en: 'Other',
      title_fr: 'Autre',
      colorTheme: 'blue',
    },
  ];

  const categoryIds: CategoryIds = {
    workshop: '',
    general: '',
    food: '',
    activity: '',
    other: '',
  };

  for (const cat of categoryDefinitions) {
    const { id } = await payload.create({
      collection: 'camp-categories',
      locale: LOCALE.DE,
      data: {
        title: cat.title_de,
        colorTheme: cat.colorTheme,
      },
      context: { disableRevalidation: true },
    });

    await payload.update({
      collection: 'camp-categories',
      id,
      locale: LOCALE.EN,
      data: { title: cat.title_en },
      context: { disableRevalidation: true },
    });

    await payload.update({
      collection: 'camp-categories',
      id,
      locale: LOCALE.FR,
      data: { title: cat.title_fr },
      context: { disableRevalidation: true },
    });

    categoryIds[cat.key] = id;
  }
  console.log('Seeding: Schedule categories created.');

  // schedule entries
  console.log('Seeding: Creating schedule entries...');
  const scheduleEntries = generateScheduleEntries(campSitesIds, userIds, categoryIds);
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
