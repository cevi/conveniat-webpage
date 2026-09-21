jest.mock('@/config/environment-variables', () => ({
  environmentVariables: {
    CEVIDB_GROUP_FULL_ADMIN: [541],
    CEVIDB_GROUP_WEB_CORE_TEAM: [105],
    CEVIDB_GROUP_TRANSLATION_TEAM: [106],
    CEVIDB_GROUP_PROGRAM_TEAM: [107],
    GROUPS_WITH_API_ACCESS: [541, 105, 106, 107],
    BILLING_ADMIN_GROUP_ID: '900',
  },
}));

import { canAccessBilling } from '@/features/payload-cms/payload-cms/access-rules/can-access-billing';
import {
  hasAdminOrWebAccess,
  hasEditorialAccess,
  isFullAdmin,
  ProgramTeamAccessForGenericPage,
} from '@/features/payload-cms/payload-cms/access-rules/roles';
import type { PayloadRequest } from 'payload';

const FULL_ADMIN = 541;
const WEB_CORE_TEAM = 105;
const TRANSLATION_TEAM = 106;
const PROGRAM_TEAM = 107;
const BILLING = 900;
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

describe('canAccessBilling', () => {
  it('wants the billing group and an admin panel login, not either alone', () => {
    expect(canAccessBilling({ req: requestFor(BILLING) })).toBe(false);
    expect(canAccessBilling({ req: requestFor(FULL_ADMIN) })).toBe(false);
    expect(canAccessBilling({ req: requestFor(FULL_ADMIN, BILLING) })).toBe(true);
  });

  it('denies a participant who somehow holds the billing group', () => {
    expect(canAccessBilling({ req: requestFor(PARTICIPANT, BILLING) })).toBe(false);
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
