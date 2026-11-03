import {
  isFullAdmin,
  shouldHideInAdminPanelIfNotAdmin,
} from '@/features/payload-cms/payload-cms/access-rules/roles';
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
    group: AdminPanelDashboardGroups.BackofficeSystem.label,
    useAsTitle: 'search_title',
    hidden: shouldHideInAdminPanelIfNotAdmin,
  },
  access: {
    // The site search reads the index through the local API. Over REST and GraphQL the index would
    // hand out page text without the release date and publishing checks the search page applies.
    read: isFullAdmin,
    update: isFullAdmin,
    create: isFullAdmin,
    delete: isFullAdmin,
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
    {
      name: 'search_date',
      type: 'date',
      admin: {
        readOnly: true,
        description: {
          en: 'The date the search sorts and filters by: the release date of a page, the date of a news entry, the last change of a document.',
          de: 'Das Datum, nach dem die Suche sortiert und filtert: das Veröffentlichungsdatum einer Seite, das Datum eines News-Eintrags, die letzte Änderung eines Dokuments.',
          fr: "La date selon laquelle la recherche trie et filtre : la date de publication d'une page, la date d'une actualité, la dernière modification d'un document.",
        },
      },
    },
    {
      name: 'search_references',
      type: 'text',
      hasMany: true,
      localized: true,
      admin: {
        readOnly: true,
        description: {
          en: 'The documents and news categories a page links to. A document or a news entry is only found through a page that shows it.',
          de: 'Die Dokumente und News-Kategorien, auf die eine Seite verweist. Ein Dokument oder ein News-Eintrag wird nur über eine Seite gefunden, die ihn zeigt.',
          fr: "Les documents et catégories d'actualités vers lesquels une page renvoie. Un document ou une actualité n'est trouvé qu'à travers une page qui l'affiche.",
        },
      },
    },
    {
      name: 'search_categories',
      type: 'text',
      hasMany: true,
      admin: {
        readOnly: true,
        description: {
          en: 'The categories of a news entry.',
          de: 'Die Kategorien eines News-Eintrags.',
          fr: "Les catégories d'une actualité.",
        },
      },
    },
  ],
};
