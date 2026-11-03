import type { Block } from 'payload';

/**
 * The icons a fact may carry, by the value stored in the CMS. The renderer maps each to its
 * lucide icon, see `fact-list.tsx`.
 */
export const FACT_LIST_ICONS = [
  { value: 'users', label: { de: 'Personen', en: 'People', fr: 'Personnes' } },
  { value: 'calendar', label: { de: 'Kalender', en: 'Calendar', fr: 'Calendrier' } },
  { value: 'clock', label: { de: 'Uhrzeit', en: 'Time', fr: 'Heure' } },
  { value: 'mapPin', label: { de: 'Ort', en: 'Place', fr: 'Lieu' } },
  { value: 'train', label: { de: 'Zug / ÖV', en: 'Train', fr: 'Train / TP' } },
  { value: 'car', label: { de: 'Auto', en: 'Car', fr: 'Voiture' } },
  { value: 'ticket', label: { de: 'Ticket', en: 'Ticket', fr: 'Billet' } },
  { value: 'wallet', label: { de: 'Kosten', en: 'Costs', fr: 'Coûts' } },
  { value: 'utensils', label: { de: 'Essen', en: 'Food', fr: 'Repas' } },
  { value: 'backpack', label: { de: 'Gepäck', en: 'Luggage', fr: 'Bagages' } },
  { value: 'tent', label: { de: 'Zelt', en: 'Tent', fr: 'Tente' } },
  { value: 'mail', label: { de: 'E-Mail', en: 'Email', fr: 'E-mail' } },
  { value: 'phone', label: { de: 'Telefon', en: 'Phone', fr: 'Téléphone' } },
  { value: 'shield', label: { de: 'Sicherheit', en: 'Safety', fr: 'Sécurité' } },
  { value: 'info', label: { de: 'Information', en: 'Information', fr: 'Information' } },
] as const;

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
              options: FACT_LIST_ICONS.map(({ value, label }) => ({ value, label })),
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
