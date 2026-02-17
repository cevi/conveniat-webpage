import { RESSORT_OPTIONS } from '@/features/payload-cms/constants/ressort-options';
import { canAccessAdminPanel } from '@/features/payload-cms/payload-cms/access-rules/can-access-admin-panel';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import { asLocalizedCollection } from '@/features/payload-cms/payload-cms/utils/localized-collection';
import type { CollectionConfig } from 'payload';

export const JobCollection: CollectionConfig = asLocalizedCollection({
  slug: 'helper-jobs',

  labels: {
    singular: {
      de: 'Helfer-Job',
      en: 'Helper Job',
      fr: "Job d'assistant",
    },
    plural: {
      de: 'Helfende Jobs',
      en: 'Helper Jobs',
      fr: "Jobs d'assistant",
    },
  },
  admin: {
    useAsTitle: 'title',
    group: AdminPanelDashboardGroups.HelferAnmeldung,
    defaultColumns: ['title', 'category', 'dateRangeCategory', 'maxQuota'],
  },
  access: {
    read: canAccessAdminPanel,
    create: canAccessAdminPanel,
    update: canAccessAdminPanel,
    delete: canAccessAdminPanel,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      localized: true,
      label: {
        en: 'Helper Job Title',
        de: 'Helfendenfunktion Job Titel',
        fr: "Titre du poste d'assistant",
      },
    },
    {
      name: 'description',
      type: 'textarea',
      required: true,
      localized: true,
      label: {
        en: 'Job Description',
        de: 'Job-Beschreibung',
        fr: 'Description du poste',
      },
    },
    {
      name: 'category',
      type: 'select',
      required: true,
      options: RESSORT_OPTIONS,
      label: {
        en: 'Ressort',
        de: 'Ressort',
        fr: 'Ressort',
      },
    },

    {
      name: 'maxQuota',
      type: 'number',
      label: {
        en: 'Max Helper Quota',
        de: 'Maximale Anzahl Helfenden',
        fr: "Quota maximum d'assistants",
      },
      admin: {
        description: {
          en: 'Maximum number of helpers allowed for this job (Empty = Unlimited).',
          de: 'Maximale Anzahl der erlaubten Helfenden für diesen Job (Leer = Unbegrenzt).',
          fr: "Nombre maximum d'assistants autorisés pour ce poste (Vide = Illimité).",
        },
      },
    },
    {
      name: 'dateRange',
      type: 'group',
      label: {
        en: 'Date Range',
        de: 'Zeitraum',
        fr: 'Période',
      },
      fields: [
        {
          name: 'startDate',
          type: 'date',
          required: true,
          label: {
            en: 'Start Date',
            de: 'Startdatum',
            fr: 'Date de début',
          },
          admin: {
            description: {
              en: 'Start date of the job.',
              de: 'Startdatum des Jobs.',
              fr: 'Date de début du poste.',
            },
          },
        },
        {
          name: 'endDate',
          type: 'date',
          required: true,
          label: {
            en: 'End Date',
            de: 'Enddatum',
            fr: 'Date de fin',
          },
          admin: {
            description: {
              en: 'End date of the job.',
              de: 'Enddatum des Jobs.',
              fr: 'Date de fin du poste.',
            },
          },
        },
      ],
    },
    {
      name: 'dateRangeCategory',
      type: 'select',
      required: true,
      options: [
        { label: 'Aufbaulager Infrastruktur', value: 'setup' },
        { label: 'Hauptlager', value: 'main' },
        { label: 'Abbaulager Infrastruktur', value: 'teardown' },
      ],
      label: {
        en: 'Date Range Category',
        de: 'Zeitraum Kategorie',
        fr: 'Catégorie de période',
      },
    },
    {
      name: 'prerequisites',
      type: 'text',
      localized: true,
      label: {
        en: 'Prerequisites',
        de: 'Voraussetzungen',
        fr: 'Prérequis',
      },
      admin: {
        description: {
          en: 'Prerequisites for the job (e.g. Minimum age, specific skills, etc.).',
          de: 'Voraussetzungen für den Job (z.B. Mindestalter, spezielle Fähigkeiten, etc.).',
          fr: 'Prérequis pour le poste (par exemple, âge minimum, compétences spécifiques, etc.).',
        },
      },
    },
    {
      name: 'submissions',
      type: 'join',
      collection: 'form-submissions',
      on: 'helper-job',
      admin: {
        allowCreate: false,
      },
      label: {
        en: 'Submissions',
        de: 'Einreichungen',
        fr: 'Soumissions',
      },
    },
  ],
});
