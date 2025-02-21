import { Block } from 'payload';

export const swisstopoMapEmbedBlock: Block = {
  slug: 'swisstopoEmbed',
  interfaceName: 'SwisstopoMapEmbedding',
  fields: [
    {
      name: 'initialMapPose',
      type: 'group',
      fields: [
        {
          name: 'zoom',
          type: 'number',
          defaultValue: 15.5,
        },
        {
          name: 'initialMapCenter',
          type: 'point',
          defaultValue: [8.303_628, 46.502_992],
        },
      ],
    },
    {
      name: 'ceviLogoMarkers',
      admin: {
        description: {
          de: 'Markierungen auf der Karte mit einem kleinen Cevi-Logo',
          en: 'Markers on the map with a small Cevi logo',
          fr: 'Marqueurs sur la carte avec un petit logo Cevi',
        },
      },
      type: 'array',
      fields: [
        {
          name: 'title',
          type: 'text',
        },
        {
          name: 'geometry',
          type: 'group',
          fields: [
            {
              name: 'coordinates',
              type: 'point',
              defaultValue: [8.303_628, 46.502_992],
            },
          ],
        },
      ],
    },
  ],
};
