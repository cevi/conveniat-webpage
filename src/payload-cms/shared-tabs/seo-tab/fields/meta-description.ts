import type { Field } from 'payload';

export const metaDescription: Field = {
  name: 'metaDescription',
  label: 'Meta Description',
  type: 'textarea',
  localized: true,
  admin: {
    description: {
      en: 'This is the description that will be displayed in search engine results.',
      de: 'Dies ist die Beschreibung, die in den Suchmaschinenergebnissen angezeigt wird.',
      fr: "C'est la description qui sera affichée dans les résultats des moteurs de recherche.",
    },
  },
};
