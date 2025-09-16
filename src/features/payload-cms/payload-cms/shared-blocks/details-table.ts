import { minimalEditorFeatures } from '@/features/payload-cms/payload-cms/plugins/lexical-editor';
import { patchRichTextLinkHook } from '@/features/payload-cms/payload-cms/utils/link-field-logic';
import {
  defaultEditorLexicalConfig,
  HeadingFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical';
import type { Block } from 'payload';

export const detailsTable: Block = {
  slug: 'detailsTable',
  interfaceName: 'DetailsTable',

  imageURL: '/admin-block-images/details-table-block.png',
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
      hooks: patchRichTextLinkHook,
    },
    {
      name: 'detailsTableBlocks',
      type: 'array',
      fields: [
        {
          name: 'label',
          label: 'Label',
          type: 'text',
          required: true,
        },
        {
          name: 'value',
          label: 'Value',
          type: 'richText',
          required: true,
          editor: lexicalEditor({
            features: [...minimalEditorFeatures],
            lexical: defaultEditorLexicalConfig,
          }),
          hooks: patchRichTextLinkHook,
        },
      ],
    },
  ],
};
