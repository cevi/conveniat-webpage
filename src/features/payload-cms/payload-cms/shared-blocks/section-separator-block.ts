import type { Block } from 'payload';

export const sectionSeparatorBlock: Block = {
  slug: 'sectionSeparator',
  interfaceName: 'SectionSeparatorBlock',

  imageURL: '/admin-block-images/section-separator-block.png',
  imageAltText: 'Section separator block',

  fields: [
    {
      name: 'isFullWidth',
      type: 'checkbox',
      defaultValue: false,
      label: {
        de: 'Volle Breite (Zentriert)',
        en: 'Full Width (Centered)',
        fr: 'Pleine Largeur (Centrée)',
      },
      admin: {
        description: {
          de: 'Wenn aktiviert, wird die Trennlinie in voller Seitenbreite (max. 1120px zentriert) dargestellt. Ansonsten in Spaltenbreite.',
          en: 'If enabled, the separator is rendered full page width (max 1120px centered). Otherwise column width.',
          fr: 'Si activé, le séparateur est affiché sur toute la largeur de la page (max 1120px centré). Sinon en largeur de colonne.',
        },
      },
    },
  ],
};
