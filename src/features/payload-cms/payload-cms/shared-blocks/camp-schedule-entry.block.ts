import type { Block } from 'payload';

export const campScheduleEntryBlock: Block = {
  slug: 'campScheduleEntryBlock',
  imageURL: '',
  imageAltText: 'Camp Schedule Entry Block',
  fields: [
    {
      name: 'date',
      type: 'date',
      timezone: true,
      label: {
        en: 'Date for which to show the entries for',
        de: 'Datum, für welches das Programm angezeigt werden soll',
        fr: 'Date pour laquelle afficher les entrées',
      },
      required: true,
      admin: {
        date: {
          pickerAppearance: 'dayOnly',
          displayFormat: 'yyyy-MM-dd',
        },
      },
    },
    {
      name: 'location',
      type: 'relationship',
      relationTo: 'camp-map-annotations',
      required: false,
      label: {
        en: 'Optionally select a location for which the entries should be shown.',
        de: 'Optional kann ein Ort ausgewählt werden, für den die Einträge angezeigt werden sollen.',
        fr: 'Vous pouvez éventuellement sélectionner un lieu pour lequel les entrées doivent être affichées.',
      },
    },
  ],
};
