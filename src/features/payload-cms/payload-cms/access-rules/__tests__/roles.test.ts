jest.mock('@/config/environment-variables', () => ({
  environmentVariables: {
    CEVIDB_GROUP_FULL_ADMIN: [541],
    CEVIDB_GROUP_WEB_CORE_TEAM: [105],
    CEVIDB_GROUP_TRANSLATION_TEAM: [106],
    // one group holding two roles, the way a deployment may configure it
    CEVIDB_GROUP_PROGRAM_TEAM: [107, 541],
    BILLING_ADMIN_GROUP_ID: [900],
    CEVIDB_GROUP_MATERIAL_TEAM: [108],
    CEVIDB_GROUP_HOF_DASHBOARD_REVIEWERS: [109],
  },
}));

import {
  canAccessBilling,
  canOpenAdminPanel,
  getRolesOfGroups,
  hasAdminOrWebAccess,
  hasBillingOrAdminOrWebAccess,
  hasEditorialAccess,
  isEditor,
  isFullAdmin,
  listRoleGroups,
  ProgramTeamAccessForGenericPage,
  Roles,
} from '@/features/payload-cms/payload-cms/access-rules/roles';
import type { PayloadRequest } from 'payload';

const FULL_ADMIN = 541;
const WEB_CORE_TEAM = 105;
const TRANSLATION_TEAM = 106;
const PROGRAM_TEAM = 107;
const BILLING = 900;
const MATERIAL_TEAM = 108;
const HOF_DASHBOARD_REVIEWER = 109;
/** A camp participant: logged in through Cevi.DB, in no group that reaches the admin panel. */
const PARTICIPANT = 4242;

const requestFor = (...groupIds: number[]): PayloadRequest =>
  ({ user: { id: 'u1', groups: groupIds.map((id) => ({ id })) } }) as unknown as PayloadRequest;

const anonymous = { user: undefined } as unknown as PayloadRequest;

describe('the named access rules', () => {
  const cases = [
    { name: 'isFullAdmin', rule: isFullAdmin, granted: [FULL_ADMIN] },
    {
      name: 'hasAdminOrWebAccess',
      rule: hasAdminOrWebAccess,
      granted: [FULL_ADMIN, WEB_CORE_TEAM],
    },
    {
      name: 'hasEditorialAccess',
      rule: hasEditorialAccess,
      granted: [FULL_ADMIN, WEB_CORE_TEAM, TRANSLATION_TEAM],
    },
  ];

  it.each(cases)('$name grants exactly its own groups', ({ rule, granted }) => {
    for (const groupId of [FULL_ADMIN, WEB_CORE_TEAM, TRANSLATION_TEAM, PROGRAM_TEAM]) {
      expect(rule({ req: requestFor(groupId) })).toBe(granted.includes(groupId));
    }
  });

  it.each(cases)('$name denies a camp participant and an anonymous request', ({ rule }) => {
    expect(rule({ req: requestFor(PARTICIPANT) })).toBe(false);
    expect(rule({ req: anonymous })).toBe(false);
  });

  it('grants a person the rights of every group they are in', () => {
    expect(hasEditorialAccess({ req: requestFor(PARTICIPANT, TRANSLATION_TEAM) })).toBe(true);
  });
});

describe('the roles of a Cevi.DB group', () => {
  it('lists every group that holds a role once, with all the roles it holds', () => {
    expect(listRoleGroups()).toEqual([
      { groupId: FULL_ADMIN, roles: [Roles.FullAdmin, Roles.ProgramTeam] },
      { groupId: WEB_CORE_TEAM, roles: [Roles.WebCoreTeam] },
      { groupId: TRANSLATION_TEAM, roles: [Roles.TranslationTeam] },
      { groupId: PROGRAM_TEAM, roles: [Roles.ProgramTeam] },
      { groupId: BILLING, roles: [Roles.BillingTeam] },
      { groupId: MATERIAL_TEAM, roles: [Roles.MaterialTeam] },
      { groupId: HOF_DASHBOARD_REVIEWER, roles: [Roles.HofDashboardReviewer] },
    ]);
  });

  it('adds up the roles of several groups and ignores a group without a role', () => {
    expect(getRolesOfGroups([PARTICIPANT, BILLING, TRANSLATION_TEAM])).toEqual([
      Roles.TranslationTeam,
      Roles.BillingTeam,
    ]);
    expect(getRolesOfGroups([PARTICIPANT])).toEqual([]);
  });
});

describe('opening the admin panel', () => {
  it('is open to the editors, the billing team and the material team', () => {
    for (const groupId of [
      FULL_ADMIN,
      WEB_CORE_TEAM,
      TRANSLATION_TEAM,
      PROGRAM_TEAM,
      BILLING,
      MATERIAL_TEAM,
    ]) {
      expect(canOpenAdminPanel({ req: requestFor(groupId) })).toBe(true);
    }
  });

  it('stays closed to the Hof dashboard reviewers, participants and anonymous requests', () => {
    expect(canOpenAdminPanel({ req: requestFor(HOF_DASHBOARD_REVIEWER) })).toBe(false);
    expect(canOpenAdminPanel({ req: requestFor(PARTICIPANT) })).toBe(false);
    expect(canOpenAdminPanel({ req: anonymous })).toBe(false);
  });
});

describe('isEditor', () => {
  it('covers the four content roles and neither of the single-purpose teams', () => {
    for (const groupId of [FULL_ADMIN, WEB_CORE_TEAM, TRANSLATION_TEAM, PROGRAM_TEAM]) {
      expect(isEditor({ req: requestFor(groupId) })).toBe(true);
    }
    for (const groupId of [BILLING, MATERIAL_TEAM, HOF_DASHBOARD_REVIEWER, PARTICIPANT]) {
      expect(isEditor({ req: requestFor(groupId) })).toBe(false);
    }
  });
});

describe('canAccessBilling', () => {
  it('is granted by the billing group alone', () => {
    expect(canAccessBilling({ req: requestFor(BILLING) })).toBe(true);
    expect(canAccessBilling({ req: requestFor(PARTICIPANT, BILLING) })).toBe(true);
  });

  it('is not part of being a full admin', () => {
    expect(canAccessBilling({ req: requestFor(FULL_ADMIN) })).toBe(false);
    expect(canAccessBilling({ req: requestFor(FULL_ADMIN, BILLING) })).toBe(true);
  });

  it('lets the billing code through on a request it marked as internal', () => {
    const internal = { ...anonymous, context: { internal: true } } as unknown as PayloadRequest;
    expect(canAccessBilling({ req: internal })).toBe(true);
  });
});

describe('hasBillingOrAdminOrWebAccess', () => {
  it('lets the billing team, the admins and the web core team in, and nobody else', () => {
    expect(hasBillingOrAdminOrWebAccess({ req: requestFor(BILLING) })).toBe(true);
    expect(hasBillingOrAdminOrWebAccess({ req: requestFor(FULL_ADMIN) })).toBe(true);
    expect(hasBillingOrAdminOrWebAccess({ req: requestFor(WEB_CORE_TEAM) })).toBe(true);
    expect(hasBillingOrAdminOrWebAccess({ req: requestFor(TRANSLATION_TEAM) })).toBe(false);
    expect(hasBillingOrAdminOrWebAccess({ req: requestFor(PROGRAM_TEAM) })).toBe(false);
    expect(hasBillingOrAdminOrWebAccess({ req: requestFor(PARTICIPANT) })).toBe(false);
    expect(hasBillingOrAdminOrWebAccess({ req: anonymous })).toBe(false);
  });
});

describe('ProgramTeamAccessForGenericPage', () => {
  it('narrows the program team to the pages it was named on', () => {
    expect(ProgramTeamAccessForGenericPage({ req: requestFor(PROGRAM_TEAM) })).toEqual({
      allowsEditsByUser: { contains: 'u1' },
    });
  });

  it('lets the editorial roles through unnarrowed and stops everyone else', () => {
    expect(ProgramTeamAccessForGenericPage({ req: requestFor(TRANSLATION_TEAM) })).toBe(true);
    expect(ProgramTeamAccessForGenericPage({ req: requestFor(PARTICIPANT) })).toBe(false);
  });
});
