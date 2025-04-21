import type { Payload } from 'payload';
import { LOCALE } from '@/features/payload-cms/payload-cms/locales';
import type { Permission } from '@/features/payload-cms/payload-types';

export const seedPermissionPublic = async (payload: Payload): Promise<Permission> => {
  const public_permission = await payload.create({
    collection: 'permissions',
    data: {
      permissionName: 'Everyone',
      permissions: [],
      public: true,
    },
  });
  await payload.update({
    collection: 'permissions',
    id: public_permission.id,
    locale: LOCALE.DE,
    data: {
      permissionName: 'Öffentlich',
    },
  });
  await payload.update({
    collection: 'permissions',
    id: public_permission.id,
    locale: LOCALE.EN,
    data: {
      permissionName: 'Public',
    },
  });
  await payload.update({
    collection: 'permissions',
    id: public_permission.id,
    locale: LOCALE.FR,
    data: {
      permissionName: 'Public',
    },
  });
  return public_permission;
};

export const seedPermissionLoggedIn = async (payload: Payload): Promise<Permission> => {
  const logged_in_permission = await payload.create({
    collection: 'permissions',
    data: {
      permissionName: 'Logged In',
      permissions: [],
      logged_in: true,
    },
  });
  await payload.update({
    collection: 'permissions',
    id: logged_in_permission.id,
    locale: LOCALE.DE,
    data: {
      permissionName: 'Eingeloggt',
    },
  });
  await payload.update({
    collection: 'permissions',
    id: logged_in_permission.id,
    locale: LOCALE.EN,
    data: {
      permissionName: 'Logged In',
    },
  });
  await payload.update({
    collection: 'permissions',
    id: logged_in_permission.id,
    locale: LOCALE.FR,
    data: {
      permissionName: 'Connecté',
    },
  });
  return logged_in_permission;
};

export const seedPermissionAdminsOnly = async (payload: Payload): Promise<Permission> => {
  const admins_only_permission = await payload.create({
    collection: 'permissions',
    data: {
      permissionName: 'Admins Only',
      permissions: [
        {
          group_id: 541,
          note: 'CeviDB Group ID',
        },
      ],
    },
  });
  await payload.update({
    collection: 'permissions',
    id: admins_only_permission.id,
    locale: LOCALE.DE,
    data: {
      permissionName: 'Nur Admins',
    },
  });
  await payload.update({
    collection: 'permissions',
    id: admins_only_permission.id,
    locale: LOCALE.EN,
    data: {
      permissionName: 'Admins Only',
    },
  });
  await payload.update({
    collection: 'permissions',
    id: admins_only_permission.id,
    locale: LOCALE.FR,
    data: {
      permissionName: 'Administrateurs uniquement',
    },
  });
  return admins_only_permission;
};
