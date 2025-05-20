import type { Field } from 'payload';

export const internalStatusField: Field = {
  name: 'internalStatus',
  type: 'select',
  defaultValue: 'draft',
  required: true,
  localized: true,
  options: [
    {
      label: {
        en: 'In Creation',
        de: 'In Erstellung',
        fr: 'En création',
      },
      value: 'draft',
    },
    {
      label: {
        en: 'Ready for Review',
        de: 'Bereit zur Überprüfung',
        fr: 'Prêt pour la révision',
      },
      value: 'review',
    },
    {
      label: {
        en: 'Approved & Proofread',
        de: 'Genehmigt & Korrekturgelesen',
        fr: 'Approuvé & règles de correction',
      },
      value: 'approved',
    },
    {
      label: {
        en: 'Archived',
        de: 'Archiviert',
        fr: 'Archivé',
      },
      value: 'archived',
    },
  ],
  label: {
    en: 'Internal Page Status',
    de: 'Interner Seitenstatus',
    fr: 'Statut de la page interne',
  },
  admin: {
    description: {
      en: 'Status of the page (internal use)',
      de: 'Status der Seite (intern)',
      fr: 'Statut de la page (interne)',
    },
    position: 'sidebar',
  },
};
