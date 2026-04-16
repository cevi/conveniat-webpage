import { LinkField } from '@/features/payload-cms/payload-cms/shared-fields/link-field';
import type { Block } from 'payload';

export const sponsorGridBlock: Block = {
  slug: 'sponsorGrid',
  interfaceName: 'SponsorGridBlock',
  labels: {
    singular: {
      de: 'Sponsoren-Raster',
      en: 'Sponsor Grid',
      fr: 'Grille de sponsors',
    },
    plural: {
      de: 'Sponsoren-Raster',
      en: 'Sponsor Grids',
      fr: 'Grilles de sponsors',
    },
  },
  fields: [
    {
      name: 'tiers',
      type: 'array',
      required: true,
      labels: {
        singular: {
          de: 'Sponsoren-Ebene',
          en: 'Sponsor Tier',
          fr: 'Niveau de sponsor',
        },
        plural: {
          de: 'Sponsoren-Ebenen',
          en: 'Sponsor Tiers',
          fr: 'Niveaux de sponsors',
        },
      },
      fields: [
        {
          name: 'title',
          type: 'text',
          localized: true,
          label: {
            de: 'Ebenen-Titel (z.B. Unsere Gold-Sponsoren)',
            en: 'Tier Title (e.g. Our Gold Sponsors)',
            fr: 'Titre du niveau (p. ex. Nos sponsors Gold)',
          },
        },
        {
          name: 'columnsDesktop',
          type: 'select',
          required: true,
          defaultValue: '4',
          label: {
            de: 'Spaltenanzahl (Desktop)',
            en: 'Number of columns (Desktop)',
            fr: 'Nombre de colonnes (Desktop)',
          },
          options: [
            { label: '2', value: '2' },
            { label: '3', value: '3' },
            { label: '4', value: '4' },
            { label: '5', value: '5' },
            { label: '6', value: '6' },
          ],
        },
        {
          name: 'sponsors',
          type: 'array',
          required: true,
          labels: {
            singular: {
              de: 'Sponsor',
              en: 'Sponsor',
              fr: 'Sponsor',
            },
            plural: {
              de: 'Sponsoren',
              en: 'Sponsors',
              fr: 'Sponsors',
            },
          },
          fields: [
            {
              name: 'image',
              type: 'relationship',
              relationTo: 'images',
              required: true,
              label: {
                de: 'Logo',
                en: 'Logo',
                fr: 'Logo',
              },
            },
            LinkField(false),
          ],
        },
      ],
    },
  ],
};
