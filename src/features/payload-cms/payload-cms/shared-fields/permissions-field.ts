import config from '@payload-config';
import type { Field } from 'payload';
import { getPayload } from 'payload';

export const defaultPublicPermission = async (): Promise<string | undefined> => {
  const payload = await getPayload({ config });
  // search payload collection for permission where "public" is true.
  const pub_perm = await payload.find({
    collection: 'permissions',
    where: {
      'special_permissions.public': {
        equals: true,
      },
    },
    limit: 1,
  });
  // return the permission or undefined
  if (pub_perm.docs.length > 0) {
    return pub_perm.docs[0]?.id ?? undefined;
  }
  return;
};

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
  defaultValue: defaultPublicPermission,
};
