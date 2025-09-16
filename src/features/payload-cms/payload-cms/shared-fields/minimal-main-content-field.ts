import { patchRichTextLinkHook } from '@/features/payload-cms/payload-cms/utils/link-field-logic';
import type { Field } from 'payload';

export const MinimalMainContentField: Field = {
  name: 'mainContent',
  type: 'richText',
  required: true,
  localized: true,
  admin: {
    description: {
      en: 'The main content of the page',
      de: 'Der Hauptinhalt der Seite',
      fr: 'Le contenu principal de la page',
    },
  },
  hooks: patchRichTextLinkHook,
};

export const MinimalMainContentFieldUnlocalized: Field = {
  ...MinimalMainContentField,
  localized: false,
};
