import { LOCALE } from '@/features/payload-cms/payload-cms/locales';
import type { Permission } from '@/features/payload-cms/payload-types';
import type { Locale } from '@/types/types';
import type { RequiredDataFromCollectionSlug } from 'payload';

export const landingPageContent = (
  publicPermission: Permission,
  locale: Locale = LOCALE.DE,
  subpageIds?: { contact?: string; aboutUs?: string; internal?: string },
): RequiredDataFromCollectionSlug<'generic-page'> => {
  const content = {
    [LOCALE.DE]: {
      title: 'Startseite',
      countDownTitle: 'Bereit für conveniat27?',
      countDownDescAbove:
        'Stattfinden wird das Lager vom Samstag, 24. Juli 2027 bis Montag, 2. August 2027 in Obergoms (VS).',
      countDownDescBelow: 'Wir erwarten etwa 5000 Teilnehmende für dieses einmalige Erlebnis!',
      metaTitle: 'Startseite',
      metaDescription: 'conveniat27',
      learnMore: 'Erfahre mehr',
      contactUs: 'Kontaktiere uns',
      internalArea: 'Interner Bereich',
      introText:
        'Willkommen auf der Hauptseite von conveniat27. Entdecken Sie unsere Aktivitäten und beglieten Sie uns auf ein unvergessliches Abenteuer!',
    },
    [LOCALE.EN]: {
      title: 'Home',
      countDownTitle: 'Ready for conveniat27?',
      countDownDescAbove:
        'The camp will take place from Saturday, July 24, 2027 to Monday, August 2, 2027 in Obergoms (VS).',
      countDownDescBelow: 'We expect about 5000 participants for this unique experience!',
      metaTitle: 'Home',
      metaDescription: 'conveniat27',
      learnMore: 'Learn more',
      contactUs: 'Contact us',
      internalArea: 'Internal Area',
      introText:
        'Welcome to the main page of conveniat27. Discover our activities and join us for an unforgettable adventure!',
    },
    [LOCALE.FR]: {
      title: 'Accueil',
      countDownTitle: 'Prêt pour conveniat27?',
      countDownDescAbove:
        'Le camp aura lieu du samedi 24 juillet 2027 au lundi 2 août 2027 à Obergoms (VS).',
      countDownDescBelow: 'Nous attendons environ 5000 participants pour cette expérience unique!',
      metaTitle: 'Accueil',
      metaDescription: 'conveniat27',
      learnMore: 'En savoir plus',
      contactUs: 'Contactez-nous',
      internalArea: 'Espace interne',
      introText:
        'Bienvenue sur la page principale de conveniat27. Découvrez nos activités et rejoignez-nous pour une aventure inoubliable !',
    },
  };

  const t = content[locale];

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
  const mainContent: any[] = [
    {
      blockType: 'richTextSection',
      richTextSection: {
        root: {
          type: 'root',
          children: [
            {
              type: 'paragraph',
              children: [
                {
                  type: 'text',
                  detail: 0,
                  format: 0,
                  mode: 'normal',
                  style: '',
                  text: t.introText,
                  version: 1,
                },
              ],
              direction: 'ltr',
              format: '',
              indent: 0,
              version: 1,
            },
          ],
          direction: 'ltr',
          format: '',
          indent: 0,
          version: 1,
        },
      },
    },
    {
      blockType: 'countdown' as const,
      endDate: '2027-07-27T10:00:00.000Z',
      title: t.countDownTitle,
      descriptionAbove: t.countDownDescAbove,
      descriptionBelow: t.countDownDescBelow,
    },
  ];

  if (subpageIds?.aboutUs) {
    mainContent.push({
      blockType: 'callToAction',
      label: t.learnMore,
      linkField: {
        type: 'reference',
        reference: {
          relationTo: 'generic-page',
          value: subpageIds.aboutUs,
        },
      },
    });
  }

  if (subpageIds?.contact) {
    mainContent.push({
      blockType: 'callToAction',
      label: t.contactUs,
      linkField: {
        type: 'reference',
        reference: {
          relationTo: 'generic-page',
          value: subpageIds.contact,
        },
      },
      inverted: true,
    });
  }

  if (subpageIds?.internal) {
    mainContent.push({
      blockType: 'callToAction',
      label: t.internalArea,
      linkField: {
        type: 'reference',
        reference: {
          relationTo: 'generic-page',
          value: subpageIds.internal,
        },
      },
    });
  }

  return {
    internalPageName: 'startseite',
    authors: [],
    internalStatus: 'approved',
    _disable_unpublishing: true,
    _status: 'published',
    content: {
      permissions: publicPermission,
      pageTitle: t.title,
      releaseDate: '2025-01-01T01:00:00.000Z',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      mainContent: mainContent,
    },
    seo: {
      urlSlug: ((): string => {
        if (locale === LOCALE.DE) return '';
        if (locale === LOCALE.FR) return 'accueil';
        return 'home';
      })(),
      // Correction: original file had urlSlug: '' for DE.
      metaTitle: t.metaTitle,
      metaDescription: t.metaDescription,
      keywords: 'conveniat27',
    },
    _localized_status: {
      published: true,
    },
    _locale: locale,
  };
};
