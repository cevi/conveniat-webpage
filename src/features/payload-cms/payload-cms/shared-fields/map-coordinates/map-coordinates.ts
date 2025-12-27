import type { Field } from 'payload';

export const MapCoordinates: Field = {
  name: 'geometry',
  label: {
    en: 'Coordinates',
    de: 'Koordinaten',
    fr: 'Coordonnées',
  },
  type: 'point',
  admin: {
    condition: (_, siblingData) => siblingData['annotationType'] === 'marker',
    components: {
      Field:
        '@/features/payload-cms/payload-cms/shared-fields/map-coordinates/map-coordinates-field',
    },
  },
  defaultValue: [8.303_628, 46.502_992],
};
