import { LOCALE } from '@/features/payload-cms/payload-cms/locales';
import type { Permission } from '@/features/payload-cms/payload-types';
import type { RequiredDataFromCollectionSlug } from 'payload';

export const contactPageContent = (
  publicPermission: Permission,
  formID: string,
): RequiredDataFromCollectionSlug<'generic-page'> => {
  return {
    internalPageName: 'contact',
    authors: [],
    internalStatus: 'approved',
    _disable_unpublishing: true,
    _status: 'published',
    content: {
      permissions: publicPermission,
      pageTitle: 'Kontakt',
      releaseDate: '2025-01-01T01:00:00.000Z',
      mainContent: [
        {
          blockType: 'richTextSection' as const,
          richTextSection: {
            root: {
              type: 'root',
              children: [
                {
                  type: 'heading',
                  children: [
                    {
                      type: 'text',
                      detail: 0,
                      format: 0,
                      mode: 'normal',
                      style: '',
                      text: 'Kontaktiere uns!',
                      version: 1,
                    },
                  ],
                  direction: 'ltr',
                  format: '',
                  indent: 0,
                  tag: 'h3',
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
          blockType: 'formBlock',
          form: formID,
        },
      ],
    },
    seo: {
      urlSlug: 'kontakt',
      metaTitle: 'Kontaktformular',
      metaDescription: 'Kontaktiere das conveniat27',
      keywords: 'conveniat27, contact',
    },
    _localized_status: {
      published: true,
    },
    _locale: LOCALE.DE,
  };
};
