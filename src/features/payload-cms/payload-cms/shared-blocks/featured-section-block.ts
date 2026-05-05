import { LinkField } from '@/features/payload-cms/payload-cms/shared-fields/link-field';
import type { Block, Field } from 'payload';

const featureFields: Field[] = [
  {
    name: 'image',
    type: 'relationship',
    relationTo: 'images',
    required: true,
    label: {
      de: 'Bild',
      en: 'Image',
      fr: 'Image',
    },
  },
  {
    name: 'label',
    type: 'text',
    required: false,
    label: {
      de: 'Label (z.B. Vision & Mission)',
      en: 'Label (e.g. Vision & Mission)',
      fr: 'Label (par ex. Vision & Mission)',
    },
  },
  {
    name: 'title',
    type: 'text',
    required: true,
    label: {
      de: 'Titel',
      en: 'Title',
      fr: 'Titre',
    },
  },
  {
    name: 'description',
    type: 'textarea',
    required: false,
    label: {
      de: 'Beschreibung',
      en: 'Description',
      fr: 'Description',
    },
  },
  LinkField(false),
];

export const featuredSectionBlock: Block = {
  slug: 'featuredSection',
  interfaceName: 'FeaturedSectionBlock',

  imageURL: '/admin-block-images/featured-section-block.png', // We can use a placeholder or leave it for now
  imageAltText: 'Featured Section block',

  labels: {
    singular: {
      de: 'Hervorgehobener Bereich',
      en: 'Featured Section',
      fr: 'Section en vedette',
    },
    plural: {
      de: 'Hervorgehobene Bereiche',
      en: 'Featured Sections',
      fr: 'Sections en vedette',
    },
  },

  fields: [
    {
      name: 'mainFeature',
      type: 'group',
      label: {
        de: 'Hauptelement (Links)',
        en: 'Main Feature (Left)',
        fr: 'Élément principal (Gauche)',
      },
      fields: featureFields,
    },
    {
      name: 'subFeatures',
      type: 'array',
      label: {
        de: 'Unterelemente (Rechts)',
        en: 'Sub Features (Right)',
        fr: 'Sous-éléments (Droite)',
      },
      minRows: 1,
      maxRows: 3,
      fields: featureFields,
    },
  ],
};
