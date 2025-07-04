import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import { minimalEditorFeatures } from '@/features/payload-cms/payload-cms/plugins/lexical-editor';
import { MapCoordinates } from '@/features/payload-cms/payload-cms/shared-fields/map-coordinates';
import {
  defaultEditorLexicalConfig,
  HeadingFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical';
import type { CollectionConfig } from 'payload';

const mapAnnotationDescriptionLexicalEditorSettings = lexicalEditor({
  features: [
    ...minimalEditorFeatures,
    HeadingFeature({
      enabledHeadingSizes: ['h3'],
    }),
  ],
  lexical: defaultEditorLexicalConfig,
});

export const CampMapAnnotationsCollection: CollectionConfig = {
  slug: 'camp-map-annotations',
  labels: {
    singular: {
      en: 'Camp Map Annotation',
      de: 'Markierung auf Lagerplatzkarte',
      fr: 'Annotation de la carte du camp',
    },
    plural: {
      en: 'Camp Map Annotations',
      de: 'Markierungen auf Lagerplatzkarte',
      fr: 'Annotations de la carte du camp',
    },
  },
  admin: {
    group: AdminPanelDashboardGroups.AppContent,
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'title',
          label: 'Title',
          type: 'text',
          required: true,
          localized: true,
          admin: {
            description: {
              en: 'The title of the annotation.',
              de: 'Der Titel der Markierung.',
              fr: "Le titre de l'annotation.",
            },
          },
        },
        {
          name: 'icon',
          label: 'Icon',
          type: 'select',
          required: false,
          localized: true,
          options: [
            {
              label: 'MapPin',
              value: 'MapPin',
            },
            {
              label: 'Tent',
              value: 'Tent',
            },
          ],
        },
      ],
    },
    {
      name: 'description',
      label: 'Description',
      type: 'richText',
      required: true,
      localized: true,
      admin: {
        description: {
          en: 'A detailed description of the annotation.',
          de: 'Eine detaillierte Beschreibung der Markierung.',
          fr: "Une description détaillée de l'annotation.",
        },
      },
      editor: mapAnnotationDescriptionLexicalEditorSettings,
    },
    MapCoordinates,
  ],
};
