jest.mock('@/config/environment-variables', () => ({
  environmentVariables: {
    CEVIDB_GROUP_FULL_ADMIN: [541],
    CEVIDB_GROUP_WEB_CORE_TEAM: [105],
    CEVIDB_GROUP_MATERIAL_TEAM: [108],
  },
}));

import type { AdminEntityGroup } from '@/features/payload-cms/payload-cms/components/admin-nav/admin-nav-groups';
import { buildAdminNavGroups } from '@/features/payload-cms/payload-cms/components/admin-nav/admin-nav-groups';
import type { TypedUser } from 'payload';

const FULL_ADMIN = 541;
const WEB_CORE_TEAM = 105;
const MATERIAL_TEAM = 108;

const userIn = (...groupIds: number[]): TypedUser =>
  ({ id: 'u1', groups: groupIds.map((id) => ({ id })) }) as unknown as TypedUser;

/** The back office groups as Payload hands them over, in sidebar order. */
const entityGroups = (locale: 'de' | 'fr' = 'de'): AdminEntityGroup[] => [
  {
    label: locale === 'de' ? 'Backoffice · Personen & Zugriff' : 'Backoffice · Personnes et accès',
    entities: [
      {
        slug: 'users',
        type: 'collections',
        label: { de: 'Benutzer', fr: 'Utilisateurs' },
      },
    ],
  },
  {
    label: locale === 'de' ? 'Backoffice · Höfe & Material' : 'Backoffice · Höfe et matériel',
    entities: [
      {
        slug: 'hof-dashboard-settings',
        type: 'globals',
        label: { de: 'Hof-Dashboard Einstellungen', fr: 'Paramètres du tableau de bord des Hofs' },
      },
    ],
  },
];

const linksByGroup = (groups: ReturnType<typeof buildAdminNavGroups>): Record<string, string[]> =>
  Object.fromEntries(groups.map((group) => [group.label, group.links.map((link) => link.href)]));

describe('buildAdminNavGroups', () => {
  it('puts the custom views of a full admin into their sidebar groups', () => {
    const groups = buildAdminNavGroups({
      entityGroups: entityGroups(),
      user: userIn(FULL_ADMIN),
      locale: 'de',
      adminRoute: '/admin',
    });

    expect(linksByGroup(groups)).toEqual({
      'Backoffice · Personen & Zugriff': ['/admin/collections/users', '/admin/access-overview'],
      'Backoffice · Höfe & Material': [
        '/admin/globals/hof-dashboard-settings',
        '/admin/material-setup',
      ],
    });
    expect(groups.flatMap((group) => group.links.map((link) => link.label))).toEqual([
      'Benutzer',
      'Zugriff nach Cevi.DB-Gruppe',
      'Hof-Dashboard Einstellungen',
      'Materialdepot einrichten',
    ]);
  });

  it('finds the groups in the language of the admin panel', () => {
    const groups = buildAdminNavGroups({
      entityGroups: entityGroups('fr'),
      user: userIn(FULL_ADMIN),
      locale: 'fr',
      adminRoute: '/admin',
    });

    expect(groups.map((group) => group.links.map((link) => link.label))).toEqual([
      ['Utilisateurs', 'Accès par groupe Cevi.DB'],
      ['Paramètres du tableau de bord des Hofs', 'Configurer le dépôt de matériel'],
    ]);
  });

  it('shows an editor neither custom view', () => {
    const groups = buildAdminNavGroups({
      entityGroups: entityGroups(),
      user: userIn(WEB_CORE_TEAM),
      locale: 'de',
      adminRoute: '/admin',
    });

    expect(linksByGroup(groups)).toEqual({
      'Backoffice · Personen & Zugriff': ['/admin/collections/users'],
      'Backoffice · Höfe & Material': ['/admin/globals/hof-dashboard-settings'],
    });
  });

  it('gives the material team the depot setup in a group of its own', () => {
    // the material team reads no collection and no global, so Payload hands over no group
    const groups = buildAdminNavGroups({
      entityGroups: [],
      user: userIn(MATERIAL_TEAM),
      locale: 'de',
      adminRoute: '/admin',
    });

    expect(linksByGroup(groups)).toEqual({
      'Backoffice · Höfe & Material': ['/admin/material-setup'],
    });
  });
});
