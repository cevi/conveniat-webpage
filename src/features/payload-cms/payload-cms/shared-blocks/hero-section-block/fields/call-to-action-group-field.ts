import type { Field } from 'payload';

const callToActionField: Field = {
  name: 'linkLabel',
  label: 'Call to Action',
  type: 'text',
  localized: true,
  required: true,
  admin: {
    description: {
      en: 'This is the call to action that will be displayed on the page.',
      de: 'Dies ist die Handlungsaufforderung, die auf der Seite angezeigt wird.',
      fr: "C'est l'appel à l'action qui sera affiché sur la page.",
    },
  },
};
const callToActionLinkField: Field = {
  name: 'link',
  label: 'Call to Action Link',
  type: 'text',
  localized: true,
  required: true,
  admin: {
    description: {
      en: 'This is the link that the call to action will point to.',
      de: 'Dies ist der Link, auf den die Handlungsaufforderung zeigt.',
      fr: "C'est le lien vers lequel l'appel à l'action pointera.",
    },
  },
};

export const callToActionGroupField: Field = {
  name: 'callToAction',
  label: 'Call to Action Group',
  type: 'group',
  fields: [callToActionField, callToActionLinkField],
};
