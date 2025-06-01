import { minimalEditorFeatures } from '@/features/payload-cms/payload-cms/plugins/lexical-editor';
import {
  defaultEditorLexicalConfig,
  HeadingFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical';
import type { Block } from 'payload';

const plainTextBlock: Block = {
  slug: 'accordionPlainTextBlock',
  interfaceName: 'PlainTextBlock',
  fields: [
    {
      name: 'value',
      label: 'Value',
      type: 'richText',
      required: true,
      editor: lexicalEditor({
        features: [...minimalEditorFeatures],
        lexical: defaultEditorLexicalConfig,
      }),
    },
  ],
};

const teamMembersBlock: Block = {
  slug: 'accordionTeamMembersBlock',
  interfaceName: 'TeamMembersBlock',
  fields: [
    {
      name: 'teamLeaderGroup',
      label: 'Team Leader Group',
      type: 'group',
      fields: [
        {
          name: 'name',
          label: 'Team Leader Name',
          type: 'text',
          required: true,
        },
        {
          name: 'ceviname',
          label: 'Team Leader Cevi-Name',
          type: 'text',
          required: false,
        },
        {
          name: 'portrait',
          label: 'Portrait',
          type: 'upload',
          relationTo: 'images',
          required: false,
        },
        {
          name: 'link',
          label: 'Link',
          type: 'text',
          required: false,
        },
      ],
    },
    {
      name: 'teamMembers',
      label: 'Team Members',
      type: 'array',
      required: false,
      fields: [
        {
          name: 'name',
          label: 'Name',
          type: 'text',
          required: true,
        },
        {
          name: 'ceviname',
          label: 'Cevi-Name',
          type: 'text',
          required: false,
        },
        {
          name: 'function',
          label: 'Function',
          type: 'text',
          required: true,
        },
      ],
    },
  ],
};

export const accordion: Block = {
  slug: 'accordion',
  interfaceName: 'AccordionBlocks',

  imageURL: '/admin-block-images/accordion-block.png',
  imageAltText: 'Details Table block',

  fields: [
    {
      name: 'introduction',
      label: 'Introduction Text',
      type: 'richText',
      required: true,
      editor: lexicalEditor({
        features: [
          ...minimalEditorFeatures,
          HeadingFeature({
            enabledHeadingSizes: ['h2', 'h3'],
          }),
        ],
        lexical: defaultEditorLexicalConfig,
      }),
    },

    {
      type: 'array',
      name: 'accordionBlocks',
      admin: {
        initCollapsed: true,
        components: {
          RowLabel: {
            path: '@/features/payload-cms/payload-cms/components/accordion-row-label#AccordionArrayRowLabel',
          },
        },
      },
      minRows: 1,
      fields: [
        {
          name: 'title',
          label: 'Accordion Block Title',
          admin: {
            description: {
              de: 'Dies ist der Titel des Akkordeonblocks. Er wird in der Übersicht angezeigt, und wenn er angeklickt wird, wird der Block erweitert.',
              en: 'This is the title of the accordion block. It will be displayed in the overview, and when clicked, the block will expand.',
              fr: "Ceci est le titre du bloc accordéon. Il sera affiché dans l'aperçu, et lorsqu'il est cliqué, le bloc se développera.",
            },
          },
          type: 'text',
          required: true,
        },
        {
          name: 'valueBlocks',
          label: 'Value Blocks',
          admin: {
            initCollapsed: true,
            description: {
              de: 'Dies ist der Inhalt des Akkordeonblocks. Er wird angezeigt, wenn der Block erweitert wird.',
              en: 'This is the content of the accordion block. It will be displayed when the block is expanded.',
              fr: 'Ceci est le contenu du bloc accordéon. Il sera affiché lorsque le bloc sera développé.',
            },
          },
          type: 'blocks',
          required: true,
          blocks: [plainTextBlock, teamMembersBlock],
        },
      ],
    },
  ],
};
