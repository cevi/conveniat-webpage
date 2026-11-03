import type { Block } from 'payload';

/**
 * A search on a page where relatives type the Hof they visit and see their Besuchstag. The Höfe
 * and their days come from the Besuchstag global, so editors write no list of their own.
 */
export const visitDayFinderBlock: Block = {
  slug: 'visitDayFinder',
  interfaceName: 'VisitDayFinderBlock',

  admin: {
    images: {
      thumbnail: {
        url: '/admin-block-images/visit-day-finder-block.png',
        alt: 'Visiting day finder block',
      },
    },
  },

  labels: {
    singular: {
      de: 'Besuchstag-Suche',
      en: 'Visiting day finder',
      fr: 'Recherche de la journée des visites',
    },
    plural: {
      de: 'Besuchstag-Suchen',
      en: 'Visiting day finders',
      fr: 'Recherches de la journée des visites',
    },
  },

  fields: [
    {
      name: 'title',
      type: 'text',
      label: { de: 'Titel', en: 'Title', fr: 'Titre' },
      admin: {
        description: {
          de: 'Optional. Steht klein und in Grossbuchstaben über der Suche, z.B. «Euer Besuchstag». Die Höfe und ihre Tage kommen aus den Einstellungen des Besuchstags.',
          en: 'Optional. Shown small and in capitals above the search, e.g. "Your visiting day". The Höfe and their days come from the visiting day settings.',
          fr: 'Facultatif. Affiché en petites majuscules au-dessus de la recherche, p. ex. « Votre journée des visites ». Les Hofs et leurs jours viennent des réglages de la journée des visites.',
        },
      },
    },
  ],
};
