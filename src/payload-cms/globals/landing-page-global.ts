import { GlobalConfig } from 'payload';
import { pageContent } from '@/payload-cms/shared-fields/page-content';
import { asLocalizedGlobal } from '@/payload-cms/utils/localized-global';
import { AdminPanelDashboardGroups } from '@/payload-cms/admin-panel-dashboard-groups';
import { localizedDefaultValue } from '@/payload-cms/utils/localized-default-value';

export const LandingPageGlobal: GlobalConfig = asLocalizedGlobal({
  slug: 'landingPage',
  label: 'Landing Page',
  admin: {
    group: AdminPanelDashboardGroups.UniqueContent,
    description: {
      en: 'Settings for the (browser) landing page',
      de: 'Einstellungen für die (Browser-) Startseite',
      fr: "Paramètres pour la page d'accueil (du navigateur)",
    },
  },
  fields: [
    {
      name: 'pageTitle',
      label: 'Page Title',
      type: 'text',
      localized: true,
      required: true,
      defaultValue: localizedDefaultValue({
        de: 'Conveniat 2027 - WIR SIND CEVI',
        en: 'Conveniat 2027 - WE ARE CEVI',
        fr: 'Conveniat 2027 - NOUS SOMMES LES UCS',
      }),
      admin: {
        description: {
          en: 'This is the title that will be displayed on the page.',
          de: 'Dies ist der Titel, der auf der Seite angezeigt wird.',
          fr: "C'est le titre qui sera affiché sur la page.",
        },
      },
    },

    pageContent,
  ],
});
