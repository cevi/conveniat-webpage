import { environmentVariables } from '@/config/environment-variables';
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
  defaultValue: () =>
    environmentVariables.CAMP_MAP_INITIAL_MAP_CENTER.split('/')
      .map((coord) => Number.parseFloat(coord.trim()))
      .filter((n) => !Number.isNaN(n)),
};
