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
  interfaceName: 'Accordion',

  imageURL: '/admin-block-images/accordion-block.png',
  imageAltText: 'Details Table block',

  fields: [
    {
      name: 'introduction',
      label: 'Introduction',
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
      label: 'Accordion Blocks',
      fields: [
        {
          name: 'title',
          label: 'Accordion Block Title',
          type: 'text',
          required: true,
        },

        {
          name: 'valueBlocks',
          label: 'Value Blocks',
          type: 'blocks',
          required: true,
          blocks: [plainTextBlock, teamMembersBlock],
        },
      ],
    },
  ],
};
