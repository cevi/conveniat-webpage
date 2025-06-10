import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import type { FieldsOverride } from 'node_modules/@payloadcms/plugin-search/dist/types';
import type { CollectionConfig } from 'payload';

export const searchOverrides: { fields?: FieldsOverride } & Partial<
  Omit<CollectionConfig, 'fields'>
> = {
  slug: 'search-collection',
  labels: {
    singular: {
      en: 'Search Index',
      de: 'Suchindex',
      fr: 'Index de recherche',
    },
    plural: {
      en: 'Search Indexes',
      de: 'Suchindizes',
      fr: 'Index de recherche',
    },
  },
  admin: {
    group: AdminPanelDashboardGroups.GlobalSettings,
    useAsTitle: 'search_title',
  },
  fields: ({ defaultFields }) => [
    ...defaultFields,
    {
      name: 'search_content',
      type: 'text',
      localized: true,
      admin: {
        readOnly: true,
        description: {
          en: 'This field is used for search indexing. It is automatically filled and not editable.',
          de: 'Dieses Feld wird für die Suchindizierung verwendet. Es wird automatisch ausgefüllt und ist nicht bearbeitbar.',
          fr: "Ce champ est utilisé pour l'indexation de recherche. Il est automatiquement rempli et n'est pas modifiable.",
        },
      },
    },
    {
      name: 'search_title',
      type: 'text',
      localized: true,
    },
  ],
};
