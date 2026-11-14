import {
  canReadCampReferences,
  hasAdminOrWebAccess,
} from '@/features/payload-cms/payload-cms/access-rules/roles';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import {
  flushPageCacheOnChange,
  flushPageCacheOnDelete,
} from '@/features/payload-cms/payload-cms/utils/flush-page-cache-on-change';
import type { CollectionConfig } from 'payload';

export const CampCategoryCollection: CollectionConfig = {
  slug: 'camp-categories',
  hooks: {
    afterChange: [flushPageCacheOnChange],
    afterDelete: [flushPageCacheOnDelete],
  },
  admin: {
    useAsTitle: 'title',
    group: AdminPanelDashboardGroups.AppCampsite.label,
    defaultColumns: ['title', 'colorTheme'],
  },
  labels: {
    singular: {
      en: 'Camp Category',
      de: 'Lager-Kategorie',
      fr: 'Catégorie du camp',
    },
    plural: {
      en: 'Camp Categories',
      de: 'Lager-Kategorien',
      fr: 'Catégories du camp',
    },
  },
  access: {
    // reference data, as the places on the map: whoever plans a Schichteinsatz or a
    // Programmblock picks its category
    read: canReadCampReferences,
    create: hasAdminOrWebAccess,
    update: hasAdminOrWebAccess,
    delete: hasAdminOrWebAccess,
  },
  fields: [
    {
      name: 'title',
      label: {
        en: 'Title',
        de: 'Titel',
        fr: 'Titre',
      },
      type: 'text',
      required: true,
      localized: true,
    },
    {
      name: 'colorTheme',
      label: {
        en: 'Color Theme',
        de: 'Farbschema',
        fr: 'Thème de couleur',
      },
      type: 'select',
      options: [
        { label: 'Purple', value: 'purple' },
        { label: 'Green', value: 'green' },
        { label: 'Blue', value: 'blue' },
        { label: 'Gray', value: 'gray' },
        { label: 'Indigo', value: 'indigo' },
        { label: 'Amber', value: 'amber' },
        { label: 'Rose', value: 'rose' },
        { label: 'Cyan', value: 'cyan' },
        { label: 'Orange', value: 'orange' },
      ],
      required: true,
      defaultValue: 'gray',
    },
    {
      name: 'isStory',
      label: {
        en: 'Part of the story (Rollenspiel)',
        de: 'Gehört zur Story (Rollenspiel)',
        fr: 'Fait partie de l’histoire (jeu de rôle)',
      },
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: {
          en: 'The blocks of this category are listed on the Story-Board, so none of them is left without a story.',
          de: 'Die Blöcke dieser Kategorie stehen im Story-Board, damit keiner ohne Story bleibt.',
          fr: 'Les blocs de cette catégorie apparaissent dans le Story-Board.',
        },
      },
    },
  ],
};
