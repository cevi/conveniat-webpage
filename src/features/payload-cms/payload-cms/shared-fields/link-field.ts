import { filterOptionsOnlyPublished } from '@/features/payload-cms/payload-cms/utils/filter-options-only-published';
import type { Blog, GenericPage } from '@/features/payload-cms/payload-types';
import type { NamedGroupField, TextFieldSingleValidation } from 'payload';

export interface LinkFieldDataType {
  type?: 'reference' | 'custom' | null;
  reference?:
    | ({
        relationTo: 'blog';
        value: string | Blog;
      } | null)
    | ({
        relationTo: 'generic-page';
        value: string | GenericPage;
      } | null);
  url?: string | null;
  openInNewTab?: boolean | null;
}

const validateURL: TextFieldSingleValidation = (url) => {
  // Check if the URL is provided
  if (url === undefined || url === null || url.trim() === '') {
    return 'URL is required';
  }
  // Validate the URL format, starting with / or https://
  const urlPattern = /^(https?:\/\/|\/)[^\s/$.?#].[^\s]*$/;
  if (!urlPattern.test(url)) {
    return 'URL must be a valid URL starting with https:// or /';
  }
  return true; // Valid URL
};

export const LinkField: NamedGroupField = {
  name: 'linkField',
  type: 'group',
  fields: [
    {
      name: 'type',
      type: 'radio',
      admin: {
        layout: 'horizontal',
      },
      defaultValue: 'reference',
      label: 'To URL Type',
      options: [
        {
          label: 'Internal link',
          value: 'reference',
        },
        {
          label: 'Custom URL',
          value: 'custom',
        },
      ],
    },
    {
      name: 'reference',
      type: 'relationship',
      admin: {
        condition: (_, siblingData) => siblingData['type'] === 'reference',
        allowCreate: false,
        allowEdit: false,
        placeholder: 'Select a document or blog post',
      },
      label: 'Document to redirect to',
      relationTo: ['blog', 'generic-page'],
      required: true,
      hasMany: false,
      filterOptions: filterOptionsOnlyPublished,
      validate: () => true,
    },
    {
      name: 'url',
      type: 'text',
      admin: {
        condition: (_, siblingData) => siblingData['type'] === 'custom',
      },
      label: 'Custom URL',
      required: true,
      validate: validateURL,
    },
    {
      name: 'openInNewTab',
      type: 'checkbox',
      label: 'Open in new tab',
      defaultValue: false,
      admin: {
        condition: (_, siblingData) => siblingData['type'] === 'custom',
      },
    },
  ],
};
