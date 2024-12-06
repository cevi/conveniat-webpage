import { GlobalConfig } from 'payload';
import { AdminPanelDashboardGroups } from '@/payload-cms/admin-panel-dashboard-groups';
import { localizedDefaultValue } from '@/payload-cms/utils/localized-default-value';

export const SeoGlobal: GlobalConfig = {
  slug: 'SEO',
  label: 'SEO Settings',
  admin: {
    group: AdminPanelDashboardGroups.GlobalSettings,
    description: {
      en: 'Settings for the search engine optimization',
      de: 'Einstellungen für die Suchmaschinenoptimierung',
      fr: "Paramètres pour l'optimisation des moteurs de recherche",
    },
  },
  fields: [
    {
      name: 'defaultTitle',
      label: 'Default Title',
      type: 'text',
      admin: {
        description:
          'The title should be under 60 characters for mobile prefer 50. The title is shown in the ' +
          'Google search results and on desktop as the tab title. This field defines the default ' +
          'value for the title, but each page can have its own title.',
      },
      required: true,
      defaultValue: localizedDefaultValue({
        de: 'Conveniat 2027 - MIR SIND CEVI',
        en: 'Conveniat 2027 - WE ARE CEVI',
        fr: 'Conveniat 2027 - NOUS SOMMES LES UCS',
      }),
    },
    {
      name: 'defaultDescription',
      label: 'Default Description',
      defaultValue: localizedDefaultValue({
        de: 'Conveniat 2027 - MIR SIND CEVI',
        en: 'Conveniat 2027 - WE ARE CEVI',
        fr: 'Conveniat 2027 - NOUS SOMMES LES UCS',
      }),
      admin: {
        description:
          'The description should be under 155 characters for mobile prefer 105. The description ' +
          'is shown in the Google search results.',
      },
      type: 'textarea',
      required: true,
    },
    {
      name: 'defaultKeywords',
      label: 'Default Keywords',
      type: 'array',
      required: true,
      admin: {
        description:
          'Keywords are not used by Google anymore, but other search engines might use them. Keywords ' +
          'are not shown directly to the user, but they are used by search engines to determine the ' +
          'content of the page. This field defines the default value for the keywords, but each page ' +
          'can have its own keywords.',
      },
      fields: [
        {
          type: 'text',
          name: 'keyword',
          required: true,
        },
      ],
      defaultValue: localizedDefaultValue({
        de: [{ keyword: 'Conveniat 2027' }, { keyword: 'Cevi Schweiz' }, { keyword: 'Lager' }],
        en: [{ keyword: 'Conveniat 2027' }, { keyword: 'Cevi Switzerland' }, { keyword: 'Camp' }],
        fr: [
          { keyword: 'Conveniat 2027' },
          { keyword: 'Unions Chrétiennes Suisses' },
          { keyword: 'Camp' },
        ],
      }),
    },
    {
      name: 'publisher',
      label: 'Webpage Publisher',
      type: 'text',
      admin: {
        description: 'The content publisher',
      },
      required: true,
      defaultValue: localizedDefaultValue({
        de: 'Conveniat · Cevi Schweiz',
        en: 'Conveniat · Cevi Switzerland',
        fr: 'Conveniat · Unions Chrétiennes Suisses',
      }),
    },
  ],
};
