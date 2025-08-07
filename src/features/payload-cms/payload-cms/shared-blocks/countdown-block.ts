import type { Block } from 'payload';

export const countdownBlock: Block = {
  slug: 'countdown',
  interfaceName: 'countdown',
  imageURL: '/admin-block-images/count-down-block.png',
  imageAltText: 'Countdown Block',
  fields: [
    {
      name: 'endDate',
      type: 'date',
      label: {
        en: 'End Date',
        de: 'Enddatum',
        fr: 'Date de fin',
      },
      required: true,
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
          displayFormat: 'yyyy-MM-dd HH:mm',
          timeIntervals: 15,
        },
      },
    },
    {
      name: 'title',
      type: 'text',
      label: {
        en: 'Title',
        de: 'Titel',
        fr: 'Titre',
      },
      required: false,
      admin: {
        description: 'Optional title for the countdown block.',
      },
    },
    {
      name: 'descriptionAbove',
      type: 'textarea',
      label: {
        en: 'Description Above',
        de: 'Beschreibung Oben',
        fr: 'Description au-dessus',
      },
      required: false,
      admin: {
        description: 'Optional description for the countdown block.',
      },
    },
    {
      name: 'descriptionBelow',
      type: 'textarea',
      label: {
        en: 'Description Below',
        de: 'Beschreibung Unten',
        fr: 'Description en dessous',
      },
      required: false,
      admin: {
        description: 'Optional description for the countdown block.',
      },
    },
  ],
};
