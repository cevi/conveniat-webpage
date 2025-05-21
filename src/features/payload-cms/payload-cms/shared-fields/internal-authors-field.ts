import type { Field } from 'payload';

export const internalAuthorsField: Field = {
  name: 'authors',
  label: {
    en: 'Authors',
    de: 'Autoren',
    fr: 'Auteurs',
  },
  admin: {
    description: {
      en: 'Authors of the Page (internal use only)',
      de: 'Autoren der Seite (nur intern)',
      fr: 'Auteurs de la page (seulement pour un usage interne)',
    },
    position: 'sidebar',
  },
  type: 'relationship',
  relationTo: 'users',
  hasMany: true,
  required: false,
};
