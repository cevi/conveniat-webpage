import { contentIconOptions } from '@/features/payload-cms/content-icons';
import type { Block } from 'payload';

/**
 * Facts in one card, each a row behind an icon tile: the rules of an event, what to bring, the
 * key data of a day. The same pattern as the facts on a programme block's page in the app.
 */
export const factListBlock: Block = {
  slug: 'factList',
  interfaceName: 'FactListBlock',

  admin: {
    images: {
      thumbnail: { url: '/admin-block-images/fact-list-block.png', alt: 'Fact list block' },
    },
  },

  labels: {
    singular: { de: 'Fakten-Liste', en: 'Fact list', fr: 'Liste de faits' },
    plural: { de: 'Fakten-Listen', en: 'Fact lists', fr: 'Listes de faits' },
  },

  fields: [
    {
      name: 'title',
      type: 'text',
      label: { de: 'Titel', en: 'Title', fr: 'Titre' },
      admin: {
        description: {
          de: 'Optional. Steht klein und in Grossbuchstaben über der Karte, z.B. «Regeln».',
          en: 'Optional. Shown small and in capitals above the card, e.g. "Rules".',
          fr: 'Facultatif. Affiché en petites majuscules au-dessus de la carte, p. ex. « Règles ».',
        },
      },
    },
    {
      name: 'facts',
      type: 'array',
      required: true,
      minRows: 1,
      maxRows: 12,
      label: { de: 'Fakten', en: 'Facts', fr: 'Faits' },
      labels: {
        singular: { de: 'Fakt', en: 'Fact', fr: 'Fait' },
        plural: { de: 'Fakten', en: 'Facts', fr: 'Faits' },
      },
      admin: { initCollapsed: true },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'icon',
              type: 'select',
              required: true,
              defaultValue: 'info',
              label: { de: 'Icon', en: 'Icon', fr: 'Icône' },
              options: contentIconOptions,
              admin: { width: '30%' },
            },
            {
              name: 'title',
              type: 'text',
              required: true,
              label: { de: 'Titel', en: 'Title', fr: 'Titre' },
              admin: {
                width: '70%',
                description: {
                  de: 'Kurz, z.B. «Anreise nur mit dem ÖV».',
                  en: 'Short, e.g. "Public transport only".',
                  fr: 'Court, p. ex. « Arrivée en transports publics uniquement ».',
                },
              },
            },
          ],
        },
        {
          name: 'description',
          type: 'textarea',
          label: { de: 'Beschreibung', en: 'Description', fr: 'Description' },
          admin: {
            description: {
              de: 'Optional. Eine Zeile Details unter dem Titel.',
              en: 'Optional. A line of detail under the title.',
              fr: 'Facultatif. Une ligne de détails sous le titre.',
            },
          },
        },
      ],
    },
  ],
};
