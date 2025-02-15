import { Field } from 'payload';

export const pageTeaserField: Field = {
  name: 'pageTeaser',
  label: 'Page Title Teaser',
  type: 'textarea',
  localized: true,
  required: true,
  admin: {
    description: {
      en: 'This is the teaser that will be displayed on the page.',
      de: 'Dies ist der Teaser, der auf der Seite angezeigt wird.',
      fr: "C'est le teaser qui sera affiché sur la page.",
    },
  },
};
