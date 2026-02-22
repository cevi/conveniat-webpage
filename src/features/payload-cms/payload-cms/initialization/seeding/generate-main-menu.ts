import type { LinkFieldDataType } from '@/features/payload-cms/payload-cms/shared-fields/link-field';

export const generateMainMenu = (
  contactPageId: string,
  aboutUsPageId: string,
  internalPageId: string,
  faqPageId: string,
): {
  label: string;
  linkField?: LinkFieldDataType;
  subMenu: { label: string; linkField: LinkFieldDataType }[];
}[] => {
  return [
    {
      label: 'Kontakt',
      linkField: {
        type: 'reference',
        reference: {
          relationTo: 'generic-page',
          value: contactPageId,
        },
        openInNewTab: false,
      } as LinkFieldDataType,
      subMenu: [],
    },
    {
      label: 'conveniat27',
      subMenu: [
        {
          label: 'Über uns',
          linkField: {
            type: 'reference',
            reference: {
              relationTo: 'generic-page',
              value: aboutUsPageId,
            },
          } as LinkFieldDataType,
        },
        {
          label: 'FAQ',
          linkField: {
            type: 'reference',
            reference: {
              relationTo: 'generic-page',
              value: faqPageId,
            },
          } as LinkFieldDataType,
        },
        {
          label: 'Cevi CH',
          linkField: {
            type: 'custom',
            url: 'https://cevi.ch',
            openInNewTab: true,
          } as LinkFieldDataType,
        },
      ],
    },
    {
      label: 'Intern',
      linkField: {
        type: 'reference',
        reference: {
          relationTo: 'generic-page',
          value: internalPageId,
        },
        openInNewTab: false,
      } as LinkFieldDataType,
      subMenu: [],
    },
  ];
};
