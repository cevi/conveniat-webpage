import { GlobalConfig } from 'payload';

export const SeoGlobal: GlobalConfig = {
  slug: 'SEO',
  label: 'SEO Settings',
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
      defaultValue: 'Conveniat 2027 - MIR SIND CEVI',
    },
    {
      name: 'defaultDescription',
      label: 'Default Description',
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
      defaultValue: [
        { keyword: 'Conveniat 2027' },
        { keyword: 'Cevi Schweiz' },
        { keyword: 'Lager' },
      ],
    },
    {
      name: 'publisher',
      label: 'Webpage Publisher',
      type: 'text',
      admin: {
        description: 'The content publisher',
      },
      required: true,
      defaultValue: 'Conveniat · Cevi Schweiz',
    },
  ],
};
