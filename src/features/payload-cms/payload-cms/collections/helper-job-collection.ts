import { RESSORT_OPTIONS } from '@/features/payload-cms/constants/ressort-options';
import { canAccessAdminPanel } from '@/features/payload-cms/payload-cms/access-rules/can-access-admin-panel';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import type { CollectionConfig } from 'payload';

export const JobCollection: CollectionConfig = {
  slug: 'helper-jobs',

  labels: {
    singular: {
      de: 'Helfender Job',
      en: 'Helper Job',
      fr: 'Helfender Job',
    },
    plural: {
      de: 'Helfender Jobs',
      en: 'Helper Jobs',
      fr: 'Helfender Jobs',
    },
  },
  admin: {
    useAsTitle: 'title',
    group: AdminPanelDashboardGroups.HelferAnmeldung,
    defaultColumns: ['title', 'category', 'dateRangeCategory', 'maxQuota'],
  },
  access: {
    read: () => true, // Publicly readable for the form
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
        en: 'Title',
        de: 'Titel',
        fr: 'Titre',
      },
    },
    {
      name: 'category',
      type: 'select',
      required: true,
      options: RESSORT_OPTIONS,
      label: {
        en: 'Category',
        de: 'Kategorie',
        fr: 'Catégorie',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      required: true,
      localized: true,
      label: {
        en: 'Description',
        de: 'Beschreibung',
        fr: 'Description',
      },
    },
    {
      name: 'maxQuota',
      type: 'number',
      label: {
        en: 'Max Quota (Empty = Unlimited)',
        de: 'Maximale Anzahl (Leer = Unbegrenzt)',
        fr: 'Quota maximum (Vide = Illimité)',
      },
      admin: {
        description: {
          en: 'Maximum number of submissions allowed for this job.',
          de: 'Maximale Anzahl der erlaubten Einreichungen für diesen Job.',
          fr: 'Nombre maximum de soumissions autorisées pour ce poste.',
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
};
