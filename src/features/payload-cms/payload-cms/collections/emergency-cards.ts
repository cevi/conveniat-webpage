import { hasAdminOrWebAccess } from '@/features/payload-cms/payload-cms/access-rules/roles';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import { minimalEditorFeatures } from '@/features/payload-cms/payload-cms/plugins/lexical-editor';
import { LastEditedByUserField } from '@/features/payload-cms/payload-cms/shared-fields/last-edited-by-user-field';
import { asLocalizedCollection } from '@/features/payload-cms/payload-cms/utils/localized-collection';
import { AlignFeature, lexicalEditor, UnorderedListFeature } from '@payloadcms/richtext-lexical';
import type { CollectionConfig } from 'payload';

export const EmergencyCardsCollection: CollectionConfig = asLocalizedCollection({
  slug: 'emergency-cards',
  admin: {
    useAsTitle: 'title',
    group: AdminPanelDashboardGroups.AppContent,
    defaultColumns: ['title', 'publishingStatus', 'updatedAt'],
  },
  labels: {
    singular: {
      en: 'Emergency Card',
      de: 'Notfallkarte',
      fr: 'Carte d’urgence',
    },
    plural: {
      en: 'Emergency Cards',
      de: 'Notfallkarten',
      fr: 'Cartes d’urgence',
    },
  },
  access: {
    read: () => true, // Anyone should be able to view emergency procedures
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
      name: 'description',
      label: {
        en: 'Description',
        de: 'Beschreibung',
        fr: 'Description',
      },
      type: 'text',
      required: true,
      localized: true,
    },
    {
      name: 'procedure',
      label: {
        en: 'Procedure (Rich Text)',
        de: 'Vorgehen (Rich Text)',
        fr: 'Procédure (Texte riche)',
      },
      type: 'richText',
      required: true,
      localized: true,
      editor: lexicalEditor({
        features: [...minimalEditorFeatures, UnorderedListFeature(), AlignFeature()],
      }),
    },
    {
      name: 'documents',
      label: {
        en: 'Linked Documents (PDFs)',
        de: 'Verknüpfte Dokumente (PDFs)',
        fr: 'Documents liés (PDFs)',
      },
      type: 'relationship',
      relationTo: 'documents',
      hasMany: true,
      localized: false,
    },
    {
      name: 'images',
      label: {
        en: 'Linked Images',
        de: 'Verknüpfte Bilder',
        fr: 'Images liées',
      },
      type: 'relationship',
      relationTo: 'images',
      hasMany: true,
      localized: false,
    },
    LastEditedByUserField,
  ],
});
