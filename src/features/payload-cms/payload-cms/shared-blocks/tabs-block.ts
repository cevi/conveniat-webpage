import { genericBlocks } from '@/features/payload-cms/payload-cms/shared-blocks/two-column-block';
import type { Block } from 'payload';

export const tabsBlock: Block = {
  slug: 'tabsBlock',
  interfaceName: 'TabsBlock',

  imageURL: '/admin-block-images/feat-tabs.png',
  imageAltText: 'Tabs Block',

  fields: [
    {
      name: 'tabs',
      type: 'array',
      required: true,
      minRows: 1,
      admin: {
        initCollapsed: true,
        components: {
          RowLabel: {
            path: '@/features/payload-cms/payload-cms/components/accordion-row-label#AccordionArrayRowLabel', // We can reuse the title row label logic or build a simple one
          },
        },
      },
      fields: [
        {
          name: 'title',
          label: {
            de: 'Tab Titel',
            en: 'Tab Title',
            fr: "Titre de l'onglet",
          },
          type: 'text',
          required: true,
        },
        {
          name: 'content',
          label: {
            de: 'Tab Inhalt',
            en: 'Tab Content',
            fr: "Contenu de l'onglet",
          },
          type: 'blocks',
          required: true,
          blocks: genericBlocks,
        },
      ],
    },
  ],
};
