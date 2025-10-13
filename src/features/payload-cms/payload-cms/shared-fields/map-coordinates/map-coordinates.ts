import type { Field } from 'payload';

export const MapCoordinates: Field = {
  name: 'geometry',
  label: {
    en: 'Coordinates of the marker',
    de: 'Koordinaten des Markers',
    fr: 'Coordonnées du marqueur',
  },
  type: 'group',
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
};
