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
          'Google search results.',
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
      name: 'keywords',
      label: 'Keywords',
      type: 'array',
      required: true,
      admin: {
        description:
          'Keywords are not used by Google anymore, but other search engines might use them.',
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
  ],
};
