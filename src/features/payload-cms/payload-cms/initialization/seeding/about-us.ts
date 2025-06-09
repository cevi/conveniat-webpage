import { LOCALE } from '@/features/payload-cms/payload-cms/locales';
import type { Permission, TeamMembersBlock } from '@/features/payload-cms/payload-types';
import type { RequiredDataFromCollectionSlug } from 'payload';

export const aboutUsContent = (
  publicPermission: Permission,
  teamLeaderImage: string,
): RequiredDataFromCollectionSlug<'generic-page'> => {
  return {
    internalPageName: 'about-us',
    authors: [],
    internalStatus: 'approved',
    _disable_unpublishing: true,
    _status: 'published',
    content: {
      permissions: publicPermission,
      pageTitle: 'Über uns',
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
                      text: 'Wir sind das conveniat27',
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
                      text: 'Entdecke alle Gesichter:',
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
              title: 'Leitung',
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
      urlSlug: 'ueber-uns',
      metaTitle: 'Über uns',
      metaDescription: 'Entdecke das conveniat27',
      keywords: 'conveniat27, about-us',
    },
    _localized_status: {
      published: true,
    },
    _locale: LOCALE.DE,
  };
};
