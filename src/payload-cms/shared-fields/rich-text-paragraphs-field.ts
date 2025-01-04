import { Field } from 'payload';
import { lexicalEditor } from '@payloadcms/richtext-lexical';

export const RichTextParagraphsField: Field = {
  name: 'richTextSection',
  label: {
    en: 'Rich Text Section',
    de: 'Textabschnitt',
    fr: 'Section de texte',
  },
  type: 'richText',
  required: true,
  localized: true,
  // Pass the Lexical editor here and override base settings as necessary
  editor: lexicalEditor({
    features: ({ rootFeatures }) => [...rootFeatures],
  }),
};
