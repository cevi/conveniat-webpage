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
      en: 'Authors of the Page (internal use)',
      de: 'Autoren der Seite (intern)',
      fr: 'Auteurs de la page (interne)',
    },
    position: 'sidebar',
  },
  type: 'relationship',
  relationTo: 'users',
  hasMany: true,
  required: true,
};