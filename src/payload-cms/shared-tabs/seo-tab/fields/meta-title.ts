import { Field } from 'payload';

export const metaTitle: Field = {
  name: 'metaTitle',
  label: 'Meta Title',
  type: 'text',
  localized: true,
  admin: {
    description: {
      en: 'This is the title that will be displayed in the browser tab.',
      de: 'Dies ist der Titel, der im Browser-Tab angezeigt wird.',
      fr: "C'est le titre qui sera affiché dans l'onglet du navigateur.",
    },
  },
};
