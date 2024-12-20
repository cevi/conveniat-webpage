import { Field } from 'payload';
import { BlocksFeature, lexicalEditor } from '@payloadcms/richtext-lexical';
import { formBlock } from '@/payload-cms/shared-blocks/form-block';

export const richTextParagraphsField: Field = {
  name: 'pageContent',
  label: 'Page Content',
  type: 'richText',
  required: true,
  localized: true,
  // Pass the Lexical editor here and override base settings as necessary
  editor: lexicalEditor({
    features: ({ rootFeatures }) => [
      ...rootFeatures,
      BlocksFeature({
        blocks: [formBlock],
      }),
    ],
  }),
};
