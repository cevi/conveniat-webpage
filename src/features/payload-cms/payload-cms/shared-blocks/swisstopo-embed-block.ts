import type { Block } from 'payload';

export const swisstopoMapEmbedBlock: Block = {
  slug: 'swisstopoEmbed',
  interfaceName: 'SwisstopoMapEmbedding',

  imageURL: '/admin-block-images/swisstopo-map-embed-block.png',
  imageAltText: 'Youtube Embed block',

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
        {
          name: 'bearing',
          type: 'number',
          defaultValue: 0,
        }
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
          label: {
            en: 'Coordinates of the marker',
            de: 'Koordinaten des Markers',
            fr: 'Coordonnées du marqueur',
          },
          admin: {
            description: {
              en: 'Coordinates of the annotation on the map.',
              de: 'Koordinaten der Markierung auf der Karte',
              fr: "Coordonnées de l'annotation sur la carte",
            },
          },
          fields: [
            {
              name: 'coordinates',
              type: 'point',
              defaultValue: [8.303_628, 46.502_992],
              admin: {
                description: 'Coordinates of the annotation on the map.',
                components: {
                  Field:
                    '@/features/payload-cms/payload-cms/shared-fields/map-coordinates/map-coordinates-field',
                },
              },
            },
          ],
        },
      ],
    },
  ],
};
