import { GlobalConfig } from 'payload';
import { AdminPanelDashboardGroups } from '@/payload-cms/admin-panel-dashboard-groups';

export const DataPrivacyStatementGlobal: GlobalConfig = {
  slug: 'data-privacy-statement',
  label: {
    en: 'Data Privacy Statement',
    de: 'Datenschutzerklärung',
    fr: 'Déclaration de confidentialité',
  },
  fields: [
    {
      name: 'urlSlug',
      label: {
        en: 'URL Slug',
        de: 'URL-Slug',
        fr: "Slug d'URL",
      },
      type: 'text',
      required: true,
      localized: true,
      defaultValue: 'datenschutzerklaerung',
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: {
          en: 'This is the URL that will be used to access the article. It should be unique and URL-friendly.',
          de: 'Dies ist die URL, die zum Zugriff auf den Artikel verwendet wird. Es sollte eindeutig und URL-freundlich sein.',
          fr: "C'est l'URL qui sera utilisée pour accéder à l'article. Il doit être unique et convivial pour les URL.",
        },
      },
    },

    {
      name: 'pageTitle',
      label: {
        en: 'Page Title',
        de: 'Seitentitel',
        fr: 'Titre de la page',
      },
      type: 'text',
      required: true,
      localized: true,
      defaultValue: 'Datenschutzerklärung',
      admin: {
        readOnly: true,
        description: {
          en: 'This is the title that will be displayed on the page.',
          de: 'Dies ist der Titel, der auf der Seite angezeigt wird.',
          fr: "C'est le titre qui sera affiché sur la page.",
        },
      },
    },
  ],
  admin: {
    group: AdminPanelDashboardGroups.UniqueContent,
    description: {
      en: 'Settings for the data privacy statement',
      de: 'Einstellungen für die Datenschutzerklärung',
      fr: 'Paramètres pour la déclaration de confidentialité',
    },
  },
};
