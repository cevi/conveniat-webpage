import { LOCALE } from '@/features/payload-cms/payload-cms/locales';
import type { Locale } from '@/types/types';
import type { RequiredDataFromCollectionSlug } from 'payload';

export const generateTimelineEntries = (): RequiredDataFromCollectionSlug<'timeline'>[] => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return [
    {
      internalPageName: 'Lagerstart 2027',
      internalStatus: 'approved',
      releaseDate: '2023-01-01T12:00:00.000Z',
      _status: 'published',
      _localized_status: { published: true },
      date: '2027-07-24T14:00:00.000Z',
      dateFormat: 'fullDate',
      _locale: LOCALE.DE,
      title: 'Lagerstart',
      mainContent: [
        {
          blockType: 'richTextSection',
          richTextSection: {
            root: {
              type: 'root',
              direction: 'ltr',
              format: '',
              indent: 0,
              version: 1,
              children: [
                {
                  type: 'paragraph',
                  format: '',
                  indent: 0,
                  version: 1,
                  children: [
                    {
                      type: 'text',
                      text: 'Das Bundeslager startet mit einer grossen Eröffnungsfeier!',
                      mode: 'normal',
                      style: '',
                      detail: 0,
                      format: 0,
                      version: 1,
                    },
                  ],
                },
              ],
            },
          },
        },
      ],
    } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
  ];
};

export const getLocalizedTimelineContent = (
  locale: Locale,
  slug: string,
): Partial<RequiredDataFromCollectionSlug<'timeline'>> => {
  if (slug === 'Lagerstart 2027') {
    // Matching by internalPageName ideally, or logic in main seeder matches items
    if (locale === LOCALE.EN) {
      return {
        _locale: LOCALE.EN,
        title: 'Camp Start',
        mainContent: [
          {
            blockType: 'richTextSection',
            richTextSection: {
              root: {
                type: 'root',
                direction: 'ltr',
                format: '',
                indent: 0,
                version: 1,
                children: [
                  {
                    type: 'paragraph',
                    format: '',
                    indent: 0,
                    version: 1,
                    children: [
                      {
                        type: 'text',
                        text: 'The national camp starts with a big opening ceremony!',
                        mode: 'normal',
                        style: '',
                        detail: 0,
                        format: 0,
                        version: 1,
                      },
                    ],
                  },
                ],
              },
            },
          },
        ],
      };
    }
    if (locale === LOCALE.FR) {
      return {
        _locale: LOCALE.FR,
        title: 'Début du camp',
        mainContent: [
          {
            blockType: 'richTextSection',
            richTextSection: {
              root: {
                type: 'root',
                direction: 'ltr',
                format: '',
                indent: 0,
                version: 1,
                children: [
                  {
                    type: 'paragraph',
                    format: '',
                    indent: 0,
                    version: 1,
                    children: [
                      {
                        type: 'text',
                        text: "Le camp national commence par une grande cérémonie d'ouverture!",
                        mode: 'normal',
                        style: '',
                        detail: 0,
                        format: 0,
                        version: 1,
                      },
                    ],
                  },
                ],
              },
            },
          },
        ],
      };
    }
  }
  return {};
};
