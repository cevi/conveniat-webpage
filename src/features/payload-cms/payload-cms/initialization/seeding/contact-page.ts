import { LOCALE } from '@/features/payload-cms/payload-cms/locales';
import type { Permission } from '@/features/payload-cms/payload-types';
import type { Locale } from '@/types/types';
import type { RequiredDataFromCollectionSlug } from 'payload';

export const contactPageContent = (
  publicPermission: Permission,
  formID: string,
  locale: Locale = LOCALE.DE,
): RequiredDataFromCollectionSlug<'generic-page'> => {
  const content = {
    [LOCALE.DE]: {
      title: 'Kontakt',
      heading: 'Kontaktiere uns!',
      metaTitle: 'Kontaktformular',
      metaDesc: 'Kontaktiere das conveniat27',
      slug: 'kontakt',
    },
    [LOCALE.EN]: {
      title: 'Contact',
      heading: 'Contact us!',
      metaTitle: 'Contact Form',
      metaDesc: 'Contact conveniat27',
      slug: 'contact',
    },
    [LOCALE.FR]: {
      title: 'Contact',
      heading: 'Contactez-nous!',
      metaTitle: 'Formulaire de contact',
      metaDesc: 'Contactez conveniat27',
      slug: 'contact',
    },
  };

  const t = content[locale];

  return {
    internalPageName: 'contact',
    authors: [],
    internalStatus: 'approved',
    _disable_unpublishing: true,
    _status: 'published',
    content: {
      permissions: publicPermission,
      pageTitle: t.title,
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
                      text: t.heading,
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
      urlSlug: t.slug,
      metaTitle: t.metaTitle,
      metaDescription: t.metaDesc,
      keywords: 'conveniat27, contact',
    },
    _localized_status: {
      published: true,
    },
    _locale: locale,
  };
};
