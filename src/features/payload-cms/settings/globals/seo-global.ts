import type { GlobalConfig } from 'payload';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/settings/admin-panel-dashboard-groups';
import { localizedDefaultValue } from '@/features/payload-cms/settings/utils/localized-default-value';

const googleSearchConsoleVerificationValidation = (
  value: string | null | undefined,
): true | string => {
  if (value === undefined || value === null || value === '') return true;

  const disallowedCharacters = ['<', '>', '/', '"', '='];

  if (
    disallowedCharacters.some((disallowedCharacter) => {
      return value.includes(disallowedCharacter);
    })
  ) {
    return 'Please paste only the content of the meta tag, not the whole meta tag.';
  }

  return true;
};

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
        de: 'conveniat27 - MIR SIND CEVI',
        en: 'conveniat27 - WE ARE CEVI',
        fr: 'conveniat27 - NOUS SOMMES LES UCS',
      }),
    },
    {
      name: 'defaultDescription',
      label: 'Default Description',
      defaultValue: localizedDefaultValue({
        de: 'conveniat27 - MIR SIND CEVI',
        en: 'conveniat27 - WE ARE CEVI',
        fr: 'conveniat27 - NOUS SOMMES LES UCS',
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
        de: [{ keyword: 'conveniat27' }, { keyword: 'Cevi Schweiz' }, { keyword: 'Lager' }],
        en: [{ keyword: 'conveniat27' }, { keyword: 'Cevi Switzerland' }, { keyword: 'Camp' }],
        fr: [
          { keyword: 'conveniat27' },
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
        de: 'conveniat27 · Cevi Schweiz',
        en: 'conveniat27 · Cevi Switzerland',
        fr: 'conveniat27 · Unions Chrétiennes Suisses',
      }),
    },
    {
      name: 'googleSearchConsoleVerification',
      label: 'Google Search Console Verification (HTML Tag)',
      type: 'text',
      admin: {
        description:
          'The HTML tag for Google Search Console verification. This tag is used to verify the ' +
          'ownership of the website in Google Search Console. Please paste only the content of the ' +
          'meta tag, not the whole meta, e.g. "gabchedl45s56dsaJKHfg_12M"',
      },
      required: false,
      validate: googleSearchConsoleVerificationValidation,
    },
  ],
};
