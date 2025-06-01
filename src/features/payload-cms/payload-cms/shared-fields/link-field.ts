import type { Blog, GenericPage } from '@/features/payload-cms/payload-types';
import type { NamedGroupField } from 'payload';

export interface LinkFieldData {
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
}

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
      },
      label: 'Document to redirect to',
      relationTo: ['blog', 'generic-page'],
      required: true,
    },
    {
      name: 'url',
      type: 'text',
      admin: {
        condition: (_, siblingData) => siblingData['type'] === 'custom',
      },
      label: 'Custom URL',
      required: true,
    },
  ],
};
