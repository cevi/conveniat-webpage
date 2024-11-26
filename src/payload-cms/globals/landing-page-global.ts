import { GlobalConfig } from 'payload';
import { pageContent } from '@/payload-cms/fields/page-content';

export const LandingPageGlobal: GlobalConfig = {
  slug: 'landingPage',
  label: 'Landing Page',
  admin: {
    group: 'Content',
    description: 'Settings for the (browser) landing page',
  },
  fields: [
    {
      name: 'pageTitle',
      label: 'Page Title',
      type: 'text',
      required: true,
      defaultValue: 'Welcome to Conveniat 2027',
      admin: {
        description: 'This is the H1 title of the landing page',
      },
    },

    pageContent,
  ],
};
