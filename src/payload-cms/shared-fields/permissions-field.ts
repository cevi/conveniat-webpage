import { Field } from 'payload';

export const permissionsField: Field = {
  name: 'permissions',
  label: {
    en: 'Permissions',
    de: 'Berechtigungen',
    fr: 'Autorisations',
  },
  type: 'relationship',
  relationTo: 'permissions',
  required: false, // default: publicly accessible
};
