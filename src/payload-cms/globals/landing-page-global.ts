import { GlobalConfig } from 'payload';
import { pageContent } from '@/payload-cms/shared-fields/page-content';
import { asLocalizedGlobal } from '@/payload-cms/utils/localized-global';
import { GlobalGroups } from '@/payload-cms/globals/global-groups';

export const LandingPageGlobal: GlobalConfig = asLocalizedGlobal({
  slug: 'landingPage',
  label: 'Landing Page',
  admin: {
    group: GlobalGroups.UniqueContent,
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
      defaultValue: 'Welcome to Conveniat 2027',
      admin: {
        description: 'This is the H1 title of the landing page',
      },
    },

    pageContent,
  ],
});
