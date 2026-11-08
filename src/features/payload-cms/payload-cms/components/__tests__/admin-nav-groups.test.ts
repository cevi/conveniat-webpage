jest.mock('@/config/environment-variables', () => ({
  environmentVariables: {
    CEVIDB_GROUP_FULL_ADMIN: [541],
    CEVIDB_GROUP_WEB_CORE_TEAM: [105],
    CEVIDB_GROUP_TRANSLATION_TEAM: [],
    CEVIDB_GROUP_PROGRAM_TEAM: [],
    CEVIDB_GROUP_MATERIAL_TEAM: [108],
    CEVIDB_GROUP_FORUM_ZENTRALE: [],
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
      'Backoffice · Personen & Zugriff': [
        '/admin/collections/users',
        '/admin/access-overview',
        '/admin/merge-users',
      ],
      'Backoffice · Höfe & Material': [
        '/admin/globals/hof-dashboard-settings',
        '/admin/material-setup',
      ],
      // the Zentrale is a page of the app
      'App · Betrieb': ['/admin/forum-protocol', '/app/forum/zentrale'],
      'App · Story': ['/admin/story-board'],
    });
    expect(groups.flatMap((group) => group.links.map((link) => link.label))).toEqual([
      'Benutzer',
      'Zugriff nach Cevi.DB-Gruppe',
      'Benutzer zusammenführen',
      'Hof-Dashboard Einstellungen',
      'Materialdepot einrichten',
      'Story-Board',
      'Forum-Protokoll',
      'Forum-Zentrale',
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
      ['Utilisateurs', 'Accès par groupe Cevi.DB', 'Fusionner des utilisateurs'],
      ['Paramètres du tableau de bord des Hofs', 'Configurer le dépôt de matériel'],
      ['Story-Board'],
      ['Protocole du forum', 'Zentrale du forum'],
    ]);
  });

  it('shows the web core team the forum protocol and the Zentrale, and no other custom view', () => {
    const groups = buildAdminNavGroups({
      entityGroups: entityGroups(),
      user: userIn(WEB_CORE_TEAM),
      locale: 'de',
      adminRoute: '/admin',
    });

    expect(linksByGroup(groups)).toEqual({
      'Backoffice · Personen & Zugriff': ['/admin/collections/users'],
      'Backoffice · Höfe & Material': ['/admin/globals/hof-dashboard-settings'],
      'App · Betrieb': ['/admin/forum-protocol', '/app/forum/zentrale'],
      'App · Story': ['/admin/story-board'],
    });
  });

  it('lists the Story-Board before the story collections of its group', () => {
    const groups = buildAdminNavGroups({
      entityGroups: [
        {
          label: 'App · Story',
          entities: [{ slug: 'story-events', type: 'collections', label: { de: 'Ereignisse' } }],
        },
      ],
      user: userIn(WEB_CORE_TEAM),
      locale: 'de',
      adminRoute: '/admin',
    });

    expect(linksByGroup(groups)['App · Story']).toEqual([
      '/admin/story-board',
      '/admin/collections/story-events',
    ]);
  });

  it('opens the Zentrale in a new tab, since it leaves the admin panel', () => {
    const groups = buildAdminNavGroups({
      entityGroups: entityGroups(),
      user: userIn(WEB_CORE_TEAM),
      locale: 'de',
      adminRoute: '/admin',
    });

    const links = groups.flatMap((group) => group.links);
    expect(links.find((link) => link.href === '/app/forum/zentrale')?.external).toBe(true);
    expect(links.find((link) => link.href === '/admin/forum-protocol')?.external).toBeUndefined();
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
