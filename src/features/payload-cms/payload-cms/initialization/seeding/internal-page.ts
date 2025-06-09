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
          blockType: 'richTextSection' as const,
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
                      text: 'Diese Seite ist nur intern zugänglich.',
                      version: 1,
                    },
                  ],
                  direction: 'ltr',
                  format: '',
                  indent: 0,
                  tag: 'h3',
                  version: 1,
                },
                {
                  children: [
                    {
                      detail: 0,
                      format: 0,
                      mode: 'normal',
                      style: '',
                      text: 'Unten kannst du ein Bild herunterladen:',
                      type: 'text',
                      version: 1,
                    },
                  ],
                  direction: 'ltr',
                  format: '',
                  indent: 0,
                  type: 'paragraph',
                  version: 1,
                  textFormat: 0,
                  textStyle: '',
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
