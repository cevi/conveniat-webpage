jest.mock('@/config/environment-variables', () => ({
  environmentVariables: {
    CEVIDB_GROUP_FULL_ADMIN: [541],
    CEVIDB_GROUP_WEB_CORE_TEAM: [105],
    CEVIDB_GROUP_TRANSLATION_TEAM: [],
    CEVIDB_GROUP_PROGRAM_TEAM: [],
    BILLING_ADMIN_GROUP_ID: [],
    CEVIDB_GROUP_MATERIAL_TEAM: [],
    CEVIDB_GROUP_HOF_DASHBOARD_REVIEWERS: [900],
  },
}));
jest.mock('@/utils/auth-helpers', () => ({ getAuthenticateUsingCeviDB: jest.fn() }));
jest.mock('@/lib/db/prisma', () => ({ __esModule: true, default: {} }));

import { UserCollection } from '@/features/payload-cms/payload-cms/collections/user-collection';
import type { FieldHook } from 'payload';

const field = UserCollection.fields.find(
  (candidate) => 'name' in candidate && candidate.name === 'adminPanelAccess',
);
const [computeAccess] = ((field && 'hooks' in field ? field.hooks.beforeChange : undefined) ??
  []) as FieldHook[];

/** The stored flag after a write carrying `siblingData` over the user stored as `stored`. */
const storedFlag = (
  siblingData: Record<string, unknown>,
  stored?: Record<string, unknown>,
): unknown =>
  computeAccess?.({ siblingData, originalDoc: stored } as unknown as Parameters<FieldHook>[0]);

describe('storing whether a user may open the admin panel', () => {
  it('is set for a login whose groups hold an admin panel role', () => {
    expect(storedFlag({ groups: [{ id: 12 }, { id: 105 }] })).toBe(true);
  });

  it('is cleared when a login no longer carries such a group', () => {
    expect(storedFlag({ groups: [{ id: 12 }] }, { groups: [{ id: 541 }] })).toBe(false);
  });

  it('keeps following the stored groups on a write that leaves them alone', () => {
    expect(storedFlag({ presentAtCamp: true }, { groups: [{ id: 541 }] })).toBe(true);
  });

  it('cannot be set by hand', () => {
    expect(storedFlag({ adminPanelAccess: true, groups: [] })).toBe(false);
  });

  it('is not granted by a role that stays outside the admin panel', () => {
    expect(storedFlag({ groups: [{ id: 900 }] })).toBe(false);
  });
});
