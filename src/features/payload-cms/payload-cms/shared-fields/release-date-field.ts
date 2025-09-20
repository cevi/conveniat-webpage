import type { Field } from 'payload';

export const releaseDate: Field = {
  name: 'releaseDate',
  label: {
    en: 'Release Date',
    de: 'Datum der Veröffentlichung',
    fr: 'Date de publication',
  },
  type: 'date',
  required: true,
  defaultValue: new Date().toISOString(),
  admin: {
    position: 'sidebar',
    date: {
      pickerAppearance: 'dayAndTime',
      displayFormat: 'yyyy-MM-dd HH:mm',
      timeIntervals: 15,
    },
  },
};
