import { biggerParagraphFeature } from '@/features/payload-cms/payload-cms/shared-fields/rich-text-paragraph-field/bigger-paragraph-feature';
import { patchRichTextLinkHook } from '@/features/payload-cms/payload-cms/utils/link-field-logic';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import type { Field } from 'payload';

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
    features: ({ rootFeatures }) => [...rootFeatures, biggerParagraphFeature()],
  }),
  hooks: patchRichTextLinkHook,
};
