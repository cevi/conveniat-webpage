import { contentIconOptions } from '@/features/payload-cms/content-icons';
import type { StaticTranslationString } from '@/types/types';
import type { Field } from 'payload';

/**
 * A short list editors fill, each row an icon, a bold title and a line under it: the steps of the
 * image upload's introduction, the points of the forum's. The app reads it as `TitledPoint`s.
 */
export const titledPointsField = (
  name: string,
  label: StaticTranslationString,
  description: StaticTranslationString,
  withoutIcon: StaticTranslationString,
): Field => ({
  name,
  type: 'array',
  localized: true,
  maxRows: 5,
  label,
  labels: {
    singular: { en: 'Point', de: 'Punkt', fr: 'Point' },
    plural: { en: 'Points', de: 'Punkte', fr: 'Points' },
  },
  admin: { description, initCollapsed: false },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'icon',
          type: 'select',
          label: { en: 'Icon', de: 'Icon', fr: 'Icône' },
          options: contentIconOptions,
          admin: { width: '30%', description: withoutIcon },
        },
        {
          name: 'title',
          type: 'text',
          required: true,
          label: { en: 'Title', de: 'Titel', fr: 'Titre' },
          admin: { width: '70%' },
        },
      ],
    },
    {
      name: 'text',
      type: 'textarea',
      label: { en: 'Text', de: 'Text', fr: 'Texte' },
    },
  ],
});
