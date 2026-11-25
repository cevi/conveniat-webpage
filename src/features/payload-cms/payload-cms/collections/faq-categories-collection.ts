import {
  hasAdminOrWebAccess,
  hasEditorialAccess,
  isEditor,
} from '@/features/payload-cms/payload-cms/access-rules/roles';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import {
  flushPageCacheOnChange,
  flushPageCacheOnDelete,
} from '@/features/payload-cms/payload-cms/utils/flush-page-cache-on-change';
import type { CollectionConfig } from 'payload';

/**
 * The categories an entry of an accordion, typically a question of an FAQ, is filed under. The
 * accordion groups its entries by them and offers one filter per category. A collection rather
 * than a text on the entry, so the same category is spelled the same on every page and its name
 * is translated once.
 */
export const FaqCategoriesCollection: CollectionConfig = {
  slug: 'faq-categories',
  // a page shows the name of the category, so renaming one changes the pages using it
  hooks: { afterChange: [flushPageCacheOnChange], afterDelete: [flushPageCacheOnDelete] },
  admin: {
    useAsTitle: 'name',
    group: AdminPanelDashboardGroups.WebpageContent.label,
    description: {
      de: 'Kategorien für die Einträge eines Akkordeons, z.B. «Finanzen» oder «Helfende» im FAQ. Das Akkordeon gruppiert seine Einträge danach und zeigt einen Filter pro Kategorie.',
      en: 'Categories for the entries of an accordion, e.g. "Finances" or "Helpers" in the FAQ. The accordion groups its entries by them and shows a filter per category.',
      fr: 'Catégories pour les entrées d’un accordéon, p. ex. « Finances » ou « Bénévoles » dans la FAQ. L’accordéon regroupe ses entrées par catégorie et affiche un filtre par catégorie.',
    },
  },
  labels: {
    singular: { de: 'FAQ-Kategorie', en: 'FAQ Category', fr: 'Catégorie FAQ' },
    plural: { de: 'FAQ-Kategorien', en: 'FAQ Categories', fr: 'Catégories FAQ' },
  },
  access: {
    // every editor who may put an accordion on a page picks a category for its entries; the
    // public site reads the names through the page, populated by the local API
    read: isEditor,
    create: hasAdminOrWebAccess,
    // the translation team translates the names
    update: hasEditorialAccess,
    delete: hasAdminOrWebAccess,
  },
  fields: [
    {
      name: 'name',
      label: { de: 'Name', en: 'Name', fr: 'Nom' },
      type: 'text',
      required: true,
      localized: true,
      admin: {
        description: {
          de: 'Kurz, er steht als Filter über dem FAQ, z.B. «Finanzen».',
          en: 'Short, it is shown as a filter above the FAQ, e.g. "Finances".',
          fr: 'Court, il apparaît comme filtre au-dessus de la FAQ, p. ex. « Finances ».',
        },
      },
    },
  ],
};
