import { LOCALE } from '@/features/payload-cms/payload-cms/locales';
import type { Permission } from '@/features/payload-cms/payload-types';
import type { Locale } from '@/types/types';
import type { RequiredDataFromCollectionSlug } from 'payload';

export const internalPageContent = (
  privatePermission: Permission,
  fileDownload: string,
  locale: Locale = LOCALE.DE,
): RequiredDataFromCollectionSlug<'generic-page'> => {
  const content = {
    [LOCALE.DE]: {
      title: 'Intern',
      heading: 'Diese Seite ist nur intern zugänglich.',
      downloadText: 'Unten kannst du ein Bild herunterladen:',
      metaTitle: 'Intern',
      slug: 'intern',
    },
    [LOCALE.EN]: {
      title: 'Internal',
      heading: 'This page is only accessible internally.',
      downloadText: 'Below you can download an image:',
      metaTitle: 'Internal',
      slug: 'internal',
    },
    [LOCALE.FR]: {
      title: 'Interne',
      heading: "Cette page n'est accessible qu'en interne.",
      downloadText: 'Ci-dessous vous pouvez télécharger une image:',
      metaTitle: 'Interne',
      slug: 'interne',
    },
  };

  const t = content[locale];

  return {
    internalPageName: 'intern',
    authors: [],
    internalStatus: 'approved',
    _disable_unpublishing: true,
    _status: 'published',
    content: {
      permissions: privatePermission,
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
                  type: 'paragraph',
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
                {
                  children: [
                    {
                      detail: 0,
                      format: 0,
                      mode: 'normal',
                      style: '',
                      text: t.downloadText,
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
      urlSlug: t.slug,
      metaTitle: t.metaTitle,
      metaDescription: 'conveniat27',
      keywords: 'conveniat27',
    },
    _localized_status: {
      published: true,
    },
    _locale: locale,
  };
};
