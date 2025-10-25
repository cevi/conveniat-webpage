import { LOCALE } from '@/features/payload-cms/payload-cms/locales';
import type { Permission } from '@/features/payload-cms/payload-types';
import type { RequiredDataFromCollectionSlug } from 'payload';

export const landingPageContent = (
  publicPermission: Permission,
): RequiredDataFromCollectionSlug<'generic-page'> => {
  return {
    internalPageName: 'startseite',
    authors: [],
    internalStatus: 'approved',
    _disable_unpublishing: true,
    _status: 'published',
    content: {
      permissions: publicPermission,
      pageTitle: 'Startseite',
      releaseDate: '2025-01-01T01:00:00.000Z',
      mainContent: [
        {
          blockType: 'countdown' as const,
          endDate: '2027-07-27T10:00:00.000Z',
          title: 'Bereit für conveniat27?',
          descriptionAbove:
            'Stattfinden wird das Lager vom Samstag, 24. Juli 2027 bis Montag, 2. August 2027 in Obergoms (VS).',
          descriptionBelow: 'Wir erwarten etwa 5000 Teilnehmende für dieses einmalige Erlebnis!',
        },
      ],
    },
    seo: {
      urlSlug: '',
      metaTitle: 'Startseite',
      metaDescription: 'conveniat27',
      keywords: 'conveniat27',
    },
    _localized_status: {
      published: true,
    },
    _locale: LOCALE.DE,
  };
};
