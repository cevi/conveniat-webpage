import {
  hasAccessToThisHelper,
  hasAdminOrWebAccess,
  Roles,
} from '@/features/payload-cms/payload-cms/access-rules/roles';
import type { Field } from 'payload';

export const AllowsEditsByUserField: Field = {
  type: 'relationship',
  name: 'allowsEditsByUser',
  label: {
    en: 'Allowed Edits By User',
    de: 'Erlaubte Bearbeitungen durch Benutzer',
    fr: "Modifications autorisées par l'utilisateur",
  },
  relationTo: 'users',
  hasMany: true,
  admin: {
    position: 'sidebar',
  },
  access: {
    read: hasAccessToThisHelper({
      requiredRoles: [Roles.FullAdmin, Roles.WebCoreTeam, Roles.ProgramTeam],
    }),
    update: hasAdminOrWebAccess,
  },
};
