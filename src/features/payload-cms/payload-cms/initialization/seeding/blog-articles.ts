import { LOCALE } from '@/features/payload-cms/payload-cms/locales';
import type { Permission } from '@/features/payload-cms/payload-types';
import type { Locale } from '@/types/types';
import type { RequiredDataFromCollectionSlug } from 'payload';

export const generateBlogArticles = (
  publicPermission: Permission,
  authorId: string,
  bannerImageId: string,
): RequiredDataFromCollectionSlug<'blog'>[] => {
  return [
    {
      internalPageName: 'Willkommen beim Cevi',
      internalStatus: 'approved',
      authors: [authorId],
      releaseDate: '2024-01-01T10:00:00.000Z',
      _status: 'published',
      _localized_status: { published: true },
      _locale: LOCALE.DE,
      content: {
        blogH1: 'Willkommen beim Cevi',
        blogShortTitle: 'Erfahre mehr über unsere spannenden Aktivitäten und Abenteuer im Wald.',
        bannerImage: bannerImageId,
        permissions: publicPermission,
        releaseDate: '2024-01-01T10:00:00.000Z',
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
                        text: 'Wir freuen uns, dass du hier bist! Der Cevi bietet unvergessliche Erlebnisse für Kinder und Jugendliche. Zusammen erleben wir spannende Geschichten, lernen neue Fähigkeiten und knüpfen Freundschaften fürs Leben.',
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
      },
      seo: {
        metaTitle: 'Willkommen beim Cevi',
        metaDescription: 'Neuigkeiten und Aktivitäten vom Cevi',
        urlSlug: 'willkommen-beim-cevi',
      },
    } as RequiredDataFromCollectionSlug<'blog'>,
  ];
};

export const getLocalizedBlogContent = (
  locale: Locale,
  articleSlug: string,
  bannerImageId: string,
): Partial<RequiredDataFromCollectionSlug<'blog'>> => {
  if (articleSlug === 'willkommen-beim-cevi') {
    if (locale === LOCALE.EN) {
      return {
        _locale: LOCALE.EN,
        content: {
          blogH1: 'Welcome to Cevi',
          blogShortTitle: 'Learn more about our exciting activities and adventures in the forest.',
          bannerImage: bannerImageId,
          releaseDate: '2024-01-01T10:00:00.000Z',
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
                          text: 'We are glad you are here! Cevi offers unforgettable experiences for children and young people. Together we experience exciting stories, learn new skills and make friends for life.',
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
        },
        seo: {
          metaTitle: 'Welcome to Cevi',
          metaDescription: 'News and activities from Cevi',
          urlSlug: 'welcome-to-cevi',
        },
      };
    }
    if (locale === LOCALE.FR) {
      return {
        _locale: LOCALE.FR,
        content: {
          blogH1: 'Bienvenue chez Cevi',
          blogShortTitle:
            'Apprenez-en plus sur nos activités passionnantes et nos aventures en forêt.',
          bannerImage: bannerImageId,
          releaseDate: '2024-01-01T10:00:00.000Z',
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
                          text: 'Nous sommes heureux que vous soyez ici ! Cevi offre des expériences inoubliables pour les enfants et les jeunes. Ensemble, nous vivons des histoires passionnantes, apprenons de nouvelles compétences et nous faisons des amis pour la vie.',
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
        },
        seo: {
          metaTitle: 'Bienvenue chez Cevi',
          metaDescription: 'Nouvelles et activités de Cevi',
          urlSlug: 'bienvenue-chez-cevi',
        },
      };
    }
  }
  return {};
};
