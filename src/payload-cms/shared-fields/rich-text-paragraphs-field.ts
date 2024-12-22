import { Field } from 'payload';
import { lexicalEditor } from '@payloadcms/richtext-lexical';

export const richTextParagraphsField: Field = {
  name: 'pageContent',
  label: 'Page Content',
  type: 'richText',
  required: true,
  localized: true,
  // Pass the Lexical editor here and override base settings as necessary
  editor: lexicalEditor({
    features: ({ rootFeatures }) => [
      ...rootFeatures
    ],
  }),
};
