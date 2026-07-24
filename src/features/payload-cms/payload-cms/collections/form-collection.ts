import {
  hasAdminOrWebAccess,
  shouldHideInAdminPanel,
} from '@/features/payload-cms/payload-cms/access-rules/roles';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import type { CollectionConfig } from 'payload';

export const FormCollection: CollectionConfig = {
  slug: 'form_collection',
  labels: {
    singular: {
      en: 'Form Document',
      de: 'Formular-Dokument',
      fr: 'Document de formulaire',
    },
    plural: {
      en: 'Form Documents',
      de: 'Formular-Dokumente',
      fr: 'Documents de formulaire',
    },
  },
  admin: {
    group: AdminPanelDashboardGroups.InternalCollections,
    groupBy: true,
    disableCopyToLocale: true,
    hidden: shouldHideInAdminPanel,
    defaultColumns: ['filename', 'isTemporary', 'createdAt', 'formSubmission'],
  },
  access: {
    read: hasAdminOrWebAccess,
    create: hasAdminOrWebAccess,
    update: hasAdminOrWebAccess,
    delete: hasAdminOrWebAccess,
  },
  fields: [
    {
      name: 'isTemporary',
      type: 'checkbox',
      defaultValue: true,
      required: true,
      index: true,
      label: {
        en: 'Is Temporary',
        de: 'Ist vorübergehend',
        fr: 'Est temporaire',
      },
      admin: {
        description: {
          en: 'Temporary files are deleted automatically after 24 hours if the form is not submitted.',
          de: 'Vorübergehende Dateien werden nach 24 Stunden automatisch gelöscht, wenn das Formular nicht abgesendet wird.',
          fr: "Les fichiers temporaires sont supprimés automatiquement après 24 heures si le formulaire n'est pas soumis.",
        },
      },
    },
    {
      name: 'form',
      type: 'relationship',
      relationTo: 'forms',
      required: false,
      label: {
        en: 'Associated Form',
        de: 'Zugehöriges Formular',
        fr: 'Formulaire associé',
      },
    },
    {
      name: 'formSubmission',
      type: 'relationship',
      relationTo: 'form-submissions',
      required: false,
      label: {
        en: 'Form Submission',
        de: 'Formular-Antwort',
        fr: 'Soumission de Formulaire',
      },
    },
    {
      name: 'originalFilename',
      type: 'text',
      required: false,
      label: {
        en: 'Original Filename',
        de: 'Ursprünglicher Dateiname',
        fr: "Nom de fichier d'origine",
      },
    },
  ],
  upload: {
    disableLocalStorage: true,
  },
};
