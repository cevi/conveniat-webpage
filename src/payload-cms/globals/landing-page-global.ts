import { Field, GlobalConfig, Tab } from 'payload';
import { asLocalizedGlobal } from '@/payload-cms/utils/localized-global';
import { AdminPanelDashboardGroups } from '@/payload-cms/admin-panel-dashboard-groups';
import { localizedDefaultValue } from '@/payload-cms/utils/localized-default-value';
import { MainContentField } from '@/payload-cms/shared-fields/main-content-field';

const PageTitleField: Field = {
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
};

const LandingPageContentTab: Tab = {
  name: 'content',
  label: {
    en: 'Content',
    de: 'Seiteninhalt',
    fr: 'Contenu',
  },
  fields: [PageTitleField, MainContentField],
};

const LandingPageSeoTab: Tab = {
  name: 'seo',
  label: {
    en: 'SEO',
    de: 'SEO',
    fr: 'SEO',
  },
  fields: [
    {
      name: 'urlSlug',
      label: 'URL Slug',
      type: 'text',
      localized: false,
      required: true,
      admin: { readOnly: true },
      defaultValue: '/',
    },
  ],
};

export const LandingPageGlobal: GlobalConfig = asLocalizedGlobal({
  slug: 'landingPage',
  label: {
    en: 'Landing Page',
    de: 'Startseite',
    fr: "Page d'accueil",
  },
  admin: {
    group: AdminPanelDashboardGroups.StaticPages,
  },

  fields: [
    {
      type: 'tabs',
      tabs: [LandingPageContentTab, LandingPageSeoTab],
    },
  ],
});
