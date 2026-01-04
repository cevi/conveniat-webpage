import type { Field } from 'payload';

export const MapPolygon: Field = {
  name: 'polygonCoordinates',
  label: {
    en: 'Polygon Coordinates',
    de: 'Polygon-Koordinaten',
    fr: 'Coordonnées du polygone',
  },
  type: 'json',
  admin: {
    description: {
      en: 'Enter the coordinates for the polygon. A closed polygon requires at least 3 points.',
      de: 'Geben Sie die Koordinaten für das Polygon ein. Ein geschlossenes Polygon benötigt mindestens 3 Punkte.',
      fr: 'Saisissez les coordonnées du polygone. Un polygone fermé nécessite au moins 3 points.',
    },
    condition: (_, siblingData) => siblingData['annotationType'] === 'polygon',
    components: {
      Field: '@/features/payload-cms/payload-cms/shared-fields/map-polygon/map-polygon-field',
    },
  },
  required: false,
};
