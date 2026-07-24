import type { Block } from 'payload';

export const photoContestBlock: Block = {
  slug: 'photoContestBlock',
  interfaceName: 'PhotoContestBlock',

  imageURL: '/admin-block-images/form-block.png',
  imageAltText: 'Photo Contest block',

  labels: {
    singular: {
      de: 'Foto-Wettbewerb Block',
      en: 'Photo Contest Block',
      fr: 'Bloc Concours Photo',
    },
    plural: {
      de: 'Foto-Wettbewerbe Blöcke',
      en: 'Photo Contest Blocks',
      fr: 'Blocs Concours Photo',
    },
  },

  fields: [
    {
      name: 'initialContestSlug',
      type: 'text',
      required: false,
      defaultValue: 'cevi-schweiz',
      label: {
        de: 'Start Wettbewerb Slug (z.B. "cevi-schweiz", "cevi-mil")',
        en: 'Initial Contest Slug (e.g. "cevi-schweiz", "cevi-mil")',
        fr: 'Slug du concours initial',
      },
      admin: {
        description: {
          de: 'Standardmässig geladener Fotowettbewerb',
          en: 'Default loaded photo contest',
          fr: 'Concours photo chargé par défaut',
        },
      },
    },
  ],
};
