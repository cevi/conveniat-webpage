import { Field } from 'payload';
import { BlocksFeature, lexicalEditor } from '@payloadcms/richtext-lexical';
import { formBlock } from '@/payload-cms/blocks/form-block';

export const pageContent: Field = {
  name: 'pageContent',
  label: 'Page Content',
  type: 'richText',
  required: true,
  // Pass the Lexical editor here and override base settings as necessary
  editor: lexicalEditor({
    features: ({ rootFeatures }) => [
      ...rootFeatures,
      BlocksFeature({
        blocks: [formBlock],
      }),
    ],
    admin: {
      hideGutter: true,
    },
  }),
  admin: {
    description: 'The content of the landing page',
  },
};
