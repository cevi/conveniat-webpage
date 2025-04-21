import type { Field } from 'payload';

export const metaKeywords: Field = {
  name: 'keywords',
  label: 'Keywords',
  type: 'text',
  localized: true,
  admin: {
    description: {
      en: 'These are the keywords that will be used to improve the visibility of the page in search engines.',
      de: 'Dies sind die Schlüsselwörter, die verwendet werden, um die Sichtbarkeit der Seite in Suchmaschinen zu verbessern.',
      fr: 'Ce sont les mots-clés qui seront utilisés pour améliorer la visibilité de la page dans les moteurs de recherche.',
    },
  },
};
