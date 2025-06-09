import { LOCALE } from '@/features/payload-cms/payload-cms/locales';
import type { Permission } from '@/features/payload-cms/payload-types';
import type { RequiredDataFromCollectionSlug } from 'payload';

export const internalPageContent = (
  privatePermission: Permission,
  fileDownload: string,
): RequiredDataFromCollectionSlug<'generic-page'> => {
  return {
    internalPageName: 'intern',
    authors: [],
    internalStatus: 'approved',
    _disable_unpublishing: true,
    _status: 'published',
    content: {
      permissions: privatePermission,
      pageTitle: 'Intern',
      releaseDate: '2025-01-01T01:00:00.000Z',
      mainContent: [
        {
          blockType: 'fileDownload',
          file: fileDownload,
        },
      ],
    },
    seo: {
      urlSlug: 'internal',
      metaTitle: 'Intern',
      metaDescription: 'conveniat27',
      keywords: 'conveniat27',
    },
    _localized_status: {
      published: true,
    },
    _locale: LOCALE.DE,
  };
};
