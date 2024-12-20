import { Field } from 'payload';

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
};

export const MinimalMainContentFieldUnlocalized: Field = {
  ...MinimalMainContentField,
  localized: false,
};
