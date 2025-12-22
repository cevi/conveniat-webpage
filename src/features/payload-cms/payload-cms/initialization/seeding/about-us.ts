import { LOCALE } from '@/features/payload-cms/payload-cms/locales';
import type { Permission, TeamMembersBlock } from '@/features/payload-cms/payload-types';
import type { Locale } from '@/types/types';
import type { RequiredDataFromCollectionSlug } from 'payload';

export const aboutUsContent = (
  publicPermission: Permission,
  teamLeaderImage: string,
  locale: Locale = LOCALE.DE,
): RequiredDataFromCollectionSlug<'generic-page'> => {
  const content = {
    [LOCALE.DE]: {
      title: 'Über uns',
      heading: 'Wir sind das conveniat27',
      accordionIntro: 'Entdecke alle Gesichter:',
      role: 'Leitung',
      metaTitle: 'Über uns',
      metaDesc: 'Entdecke das conveniat27',
      slug: 'ueber-uns',
    },
    [LOCALE.EN]: {
      title: 'About Us',
      heading: 'We are conveniat27',
      accordionIntro: 'Discover all faces:',
      role: 'Leadership',
      metaTitle: 'About Us',
      metaDesc: 'Discover conveniat27',
      slug: 'about-us',
    },
    [LOCALE.FR]: {
      title: 'À propos de nous',
      heading: 'Nous sommes conveniat27',
      accordionIntro: 'Découvrez tous les visages:',
      role: 'Direction',
      metaTitle: 'À propos de nous',
      metaDesc: 'Découvrez conveniat27',
      slug: 'a-propos-de-nous',
    },
  };

  const t = content[locale];

  return {
    internalPageName: 'about-us',
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
          blockType: 'accordion',
          introduction: {
            root: {
              children: [
                {
                  children: [
                    {
                      detail: 0,
                      format: 0,
                      mode: 'normal',
                      style: '',
                      text: t.accordionIntro,
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
              type: 'root',
              version: 1,
            },
          },
          accordionBlocks: [
            {
              titleOrPortrait: 'title',
              title: t.role,
              valueBlocks: [
                {
                  blockType: 'accordionTeamMembersBlock',
                  teamLeaderGroup: {
                    name: 'Max Muster',
                    ceviname: 'Müsterli',
                    portrait: teamLeaderImage,
                  },
                } as TeamMembersBlock,
              ],
            },
          ],
        },
      ],
    },
    seo: {
      urlSlug: t.slug,
      metaTitle: t.metaTitle,
      metaDescription: t.metaDesc,
      keywords: 'conveniat27, about-us',
    },
    _localized_status: {
      published: true,
    },
    _locale: locale,
  };
};
