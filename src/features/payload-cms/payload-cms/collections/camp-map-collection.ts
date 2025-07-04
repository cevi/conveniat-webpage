import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import { minimalEditorFeatures } from '@/features/payload-cms/payload-cms/plugins/lexical-editor';
import { MapCoordinates } from '@/features/payload-cms/payload-cms/shared-fields/map-coordinates';
import type { CampMapAnnotation } from '@/features/payload-cms/payload-types';
import {
  defaultEditorLexicalConfig,
  HeadingFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical';
import type { CollectionConfig, Field } from 'payload';

const mapAnnotationDescriptionLexicalEditorSettings = lexicalEditor({
  features: [
    ...minimalEditorFeatures,
    HeadingFeature({
      enabledHeadingSizes: ['h3'],
    }),
  ],
  lexical: defaultEditorLexicalConfig,
});

const AnnotationPointField: Field = MapCoordinates;
AnnotationPointField.admin = {
  ...MapCoordinates.admin,
  condition: (_, siblingData: Partial<CampMapAnnotation>): boolean =>
    siblingData.annotationType === 'marker',
};

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
          required: true,
          localized: true,
          options: [
            {
              label: {
                en: 'Map Pin',
                de: 'Kartenmarkierung',
                fr: 'Épingle de carte',
              },
              value: 'MapPin',
            },
            {
              label: {
                en: 'Tent',
                de: 'Zelt',
                fr: 'Tente',
              },
              value: 'Tent',
            },
            {
              label: {
                en: 'Restaurant',
                de: 'Restaurant',
                fr: 'Restauration',
              },
              value: 'Utensils',
            },
            {
              label: {
                en: 'Flag',
                de: 'Flagge',
                fr: 'Drapeau',
              },
              value: 'Flag',
            },
            {
              label: {
                en: 'Help',
                de: 'Hilfe',
                fr: 'Aide',
              },
              value: 'HelpCircle',
            },
            {
              label: {
                en: 'Recycle Station',
                de: 'Recycling Station',
                fr: 'Station de recyclage',
              },
              value: 'Recycle',
            },
            {
              label: {
                en: 'Faucet',
                de: 'Wasserhahn',
                fr: 'Robinet',
              },
              value: 'GlassWater',
            },
            {
              label: {
                en: 'Medical Assistance',
                de: 'Medizinische Hilfe',
                fr: 'Assistance médicale',
              },
              value: 'BriefcaseMedical',
            },
          ],
          admin: {
            condition: (_, siblingData: Partial<CampMapAnnotation>) =>
              siblingData.annotationType === 'marker',
          },
        },
      ],
    },
    {
      name: 'color',
      label: 'color',
      type: 'select',
      options: [
        {
          label: {
            en: 'Black',
            de: 'Schwarz',
            fr: 'Noir',
          },
          value: '#000000',
        },
        {
          label: {
            en: 'Red',
            de: 'Rot',
            fr: 'Rouge',
          },
          value: '#FF0000',
        },
        {
          label: {
            en: 'Green',
            de: 'Grün',
            fr: 'Vert',
          },
          value: '#47564c',
        },
        {
          label: {
            en: 'Blue',
            de: 'Blau',
            fr: 'Bleu',
          },
          value: '#0000FF',
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
    {
      name: 'annotationType',
      label: 'Annotation Type',
      type: 'select',
      required: true,
      options: [
        {
          label: 'Marker',
          value: 'marker',
        },
        {
          label: 'Closed Polygon',
          value: 'polygon',
        },
      ],
      defaultValue: 'marker',
    },

    AnnotationPointField,

    {
      name: 'polygonCoordinates',
      label: 'Polygon Coordinates',
      type: 'array',
      minRows: 3,
      fields: [
        {
          name: 'latitude',
          label: 'Latitude',
          type: 'number',
          required: true,
        },
        {
          name: 'longitude',
          label: 'Longitude',
          type: 'number',
          required: true,
        },
      ],
      admin: {
        description: {
          en: 'Enter the coordinates for the polygon. A closed polygon requires at least 3 points.',
          de: 'Geben Sie die Koordinaten für das Polygon ein. Ein geschlossenes Polygon benötigt mindestens 3 Punkte.',
          fr: 'Saisissez les coordonnées du polygone. Un polygone fermé nécessite au moins 3 points.',
        },
        condition: (_, siblingData: Partial<CampMapAnnotation>) =>
          siblingData.annotationType === 'polygon',
      },
      required: false,
    },
  ],
};
