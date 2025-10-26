import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import { minimalEditorFeatures } from '@/features/payload-cms/payload-cms/plugins/lexical-editor';
import { MapCoordinates } from '@/features/payload-cms/payload-cms/shared-fields/map-coordinates/map-coordinates';
import { patchRichTextLinkHook } from '@/features/payload-cms/payload-cms/utils/link-field-logic';
import type { CampMapAnnotation } from '@/features/payload-cms/payload-types';
import {
  defaultEditorLexicalConfig,
  HeadingFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical';
import type { CollectionConfig, Field } from 'payload';
import { LastEditedByUserField } from '@/features/payload-cms/payload-cms/shared-fields/last-edited-by-user-field';

export const mapAnnotationDescriptionLexicalEditorSettings = lexicalEditor({
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
  trash: true,

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
    useAsTitle: 'title',
    group: AdminPanelDashboardGroups.AppContent,
    groupBy: true,
    /** this is broken with our localized versions */
    disableCopyToLocale: true,
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
                en: 'Stage',
                de: 'Bühne',
                fr: 'Scène',
              },
              value: 'Stage',
            },
            {
              label: {
                en: 'Toilet',
                de: 'Toilette',
                fr: 'Toilette',
              },
              value: 'Toilet',
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
            en: 'Gray',
            de: 'Grau',
            fr: 'Gris',
          },
          value: '#78909c',
        },
        {
          label: {
            en: 'Yellow',
            de: 'Yellow',
            fr: 'Yellow',
          },
          value: '#fbc02d',
        },
        {
          label: {
            en: 'Orange',
            de: 'Orange',
            fr: 'Orange',
          },
          value: '#ff8126',
        },
        {
          label: {
            en: 'Violet',
            de: 'Violett',
            fr: 'Violet',
          },
          value: '#b56aff',
        },
        {
          label: {
            en: 'Rose',
            de: 'Rosa',
            fr: 'Rose',
          },
          value: '#f848c7',
        },
        {
          label: {
            en: 'Green',
            de: 'Grün',
            fr: 'Vert',
          },
          value: '#16a672',
        },
        {
          label: {
            en: 'Red',
            de: 'Rot',
            fr: 'Rouge',
          },
          value: '#f64955',
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
      hooks: patchRichTextLinkHook,
    },
    {
      name: 'openingHours',
      label: 'Opening Hours',
      type: 'array',
      fields: [
        {
          name: 'day',
          label: 'Day',
          type: 'select',
          options: [
            { label: 'Monday', value: 'monday' },
            { label: 'Tuesday', value: 'tuesday' },
            { label: 'Wednesday', value: 'wednesday' },
            { label: 'Thursday', value: 'thursday' },
            { label: 'Friday', value: 'friday' },
            { label: 'Saturday', value: 'saturday' },
            { label: 'Sunday', value: 'sunday' },
          ],
          required: false,
        },
        {
          name: 'time',
          label: 'Time',
          type: 'text',
          required: true,
          admin: {
            description: {
              en: 'Opening hours in HH:mm format (e.g., 08:00 - 18:00)',
              de: 'Öffnungszeiten im Format HH:mm (z.B. 08:00 - 18:00)',
              fr: "Heures d'ouverture au format HH:mm (par exemple, 08h00 - 18h00)",
            },
          },
          validate: (value: string | string[] | undefined | null): true | string => {
            if (typeof value !== 'string') {
              return 'Invalid time format. Use HH:mm - HH:mm.';
            }
            const timePattern = /^([01]\d|2[0-3]):([0-5]\d) - ([01]\d|2[0-3]):([0-5]\d)$/;
            return timePattern.test(value) || 'Invalid time format. Use HH:mm - HH:mm.';
          },
        },
      ],
    },
    {
      name: 'images',
      label: 'Images',
      admin: {
        isSortable: true,
        appearance: 'drawer',
      },
      type: 'relationship',
      relationTo: 'images',
      hasMany: true,
      required: false,
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
    LastEditedByUserField
  ],
};
