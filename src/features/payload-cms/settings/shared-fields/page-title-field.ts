import type { Field } from 'payload';
import { localizedDefaultValue } from '@/features/payload-cms/settings/utils/localized-default-value';

export const pageTitleField: Field = {
  name: 'pageTitle',
  label: 'Page Title',
  type: 'text',
  localized: true,
  required: true,
  defaultValue: localizedDefaultValue({
    de: 'conveniat27 - WIR SIND CEVI',
    en: 'conveniat27 - WE ARE CEVI',
    fr: 'conveniat27 - NOUS SOMMES LES UCS',
  }),
  admin: {
    description: {
      en: 'This is the title that will be displayed on the page.',
      de: 'Dies ist der Titel, der auf der Seite angezeigt wird.',
      fr: "C'est le titre qui sera affiché sur la page.",
    },
  },
};
