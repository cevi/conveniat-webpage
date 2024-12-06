import { GlobalConfig } from 'payload';
import { pageContent } from '@/payload-cms/shared-fields/page-content';
import { asLocalizedGlobal } from '@/payload-cms/utils/localized-global';

export const LandingPageGlobal: GlobalConfig = asLocalizedGlobal({
  slug: 'landingPage',
  label: 'Landing Page',
  admin: {
    group: 'Unique Content',
    description: 'Settings for the (browser) landing page',
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
