import type { Field } from 'payload';

export const MapCoordinates: Field = {
  name: 'geometry',
  type: 'group',
  fields: [
    {
      name: 'coordinates',
      type: 'point',
      defaultValue: [8.303_628, 46.502_992],
    },
  ],
};
