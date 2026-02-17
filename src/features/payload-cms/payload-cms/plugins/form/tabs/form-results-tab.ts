import type { Tab } from 'payload';

export const formResultsTab: Tab = {
  label: {
    en: 'Submissions',
    de: 'Ergebnisse',
    fr: 'Soumissions',
  },
  fields: [
    {
      name: 'exportAsCSV',
      type: 'ui',
      admin: {
        disableListColumn: true,
        components: {
          Field: {
            path: '@/features/payload-cms/payload-cms/components/form-export-button#FormExportButton',
          },
        },
      },
    },
    {
      type: 'group',
      label: {
        en: 'Submissions',
        de: 'Ergebnisse',
        fr: 'Soumissions',
      },
      virtual: true,
      fields: [
        {
          name: 'submissions',
          type: 'join',
          collection: 'form-submissions',
          on: 'form',
          admin: {
            allowCreate: false,
          },
        },
      ],
    },
  ],
};
