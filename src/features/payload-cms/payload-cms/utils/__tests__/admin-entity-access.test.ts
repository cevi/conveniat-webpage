import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import {
  evaluateEntityAccess,
  isHiddenInAdmin,
  resolveGroupKey,
  resolveLoginBaseline,
  toAccessStatus,
} from '@/features/payload-cms/payload-cms/utils/admin-entity-access';
import type { PayloadRequest, SanitizedCollectionConfig } from 'payload';

const requestWithLogger = (): PayloadRequest =>
  ({ payload: { logger: { debug: jest.fn() } } }) as unknown as PayloadRequest;

const collectionWith = (
  overrides: Partial<{ access: unknown; admin: unknown }>,
): SanitizedCollectionConfig =>
  ({ slug: 'test', access: {}, admin: {}, ...overrides }) as unknown as SanitizedCollectionConfig;

describe('toAccessStatus', () => {
  it('maps a boolean to granted or denied and a query to conditional', () => {
    expect(toAccessStatus(true)).toBe('granted');
    expect(toAccessStatus(false)).toBe('denied');
    expect(toAccessStatus({ allowsEditsByUser: { contains: 'u1' } })).toBe('conditional');
    expect(toAccessStatus('yes')).toBe('denied');
  });
});

describe('evaluateEntityAccess', () => {
  it('runs the four collection rules and reports each outcome', async () => {
    const config = collectionWith({
      access: {
        read: () => ({ status: { equals: 'published' } }),
        create: () => Promise.resolve(true),
        update: () => false,
        delete: () => {
          throw new Error('boom');
        },
      },
    });

    const result = await evaluateEntityAccess(
      { type: 'collections', slug: 'test', config },
      requestWithLogger(),
    );

    expect(result).toEqual({
      read: 'conditional',
      create: 'granted',
      update: 'denied',
      delete: 'denied',
    });
  });

  it('only evaluates read and update for a global', async () => {
    const config = collectionWith({ access: { read: () => true, update: () => true } });

    const result = await evaluateEntityAccess(
      { type: 'globals', slug: 'test', config },
      requestWithLogger(),
    );

    expect(Object.keys(result).sort()).toEqual(['read', 'update']);
  });
});

describe('isHiddenInAdmin', () => {
  it('treats a throwing hidden function as hidden, like Payload does', () => {
    const user = { id: 'u1' } as unknown as PayloadRequest['user'];
    const hiddenByFunction = collectionWith({ admin: { hidden: () => true } });
    const shown = collectionWith({ admin: { hidden: false } });
    const throwing = collectionWith({
      admin: {
        hidden: () => {
          throw new Error('boom');
        },
      },
    });

    expect(isHiddenInAdmin({ config: hiddenByFunction }, user)).toBe(true);
    expect(isHiddenInAdmin({ config: shown }, user)).toBe(false);
    expect(isHiddenInAdmin({ config: throwing }, user)).toBe(true);
  });
});

describe('resolveGroupKey', () => {
  it('finds the group by its German sidebar label and ignores unknown groups', () => {
    expect(resolveGroupKey({ ...AdminPanelDashboardGroups.AppOperations.label })).toBe(
      'AppOperations',
    );
    expect(resolveGroupKey({ de: 'Rechnungen', en: 'Billing', fr: 'Facturation' })).toBeUndefined();
    expect(resolveGroupKey('Plain string group')).toBeUndefined();
  });
});

describe('AdminPanelDashboardGroups', () => {
  it('prefixes every sidebar label with its area in all three locales', () => {
    for (const group of Object.values(AdminPanelDashboardGroups)) {
      for (const locale of ['de', 'en', 'fr'] as const) {
        expect(group.label[locale]).toContain(' · ');
        expect(group.label[locale].endsWith(group.name[locale])).toBe(true);
      }
    }
  });

  it('keeps sidebar labels unique so Payload does not merge two groups', () => {
    const labels = Object.values(AdminPanelDashboardGroups).map((group) => group.label.de);
    expect(new Set(labels).size).toBe(labels.length);
  });
});

describe('resolveLoginBaseline', () => {
  const columns = [
    { key: 'admin', groupIds: [541] },
    { key: 'web', groupIds: [105] },
    { key: 'billing', groupIds: [900] },
  ];

  it('leaves a column that is a login group on its own', () => {
    const resolved = resolveLoginBaseline(columns, [541, 105, 700, 900]);
    expect(resolved[0]).toEqual({
      key: 'admin',
      groupIds: [541],
      isAddOn: false,
      baselineGroupIds: [],
      borrowedFrom: undefined,
    });
  });

  it('gives an add-on column the login groups that are no column of their own', () => {
    const resolved = resolveLoginBaseline(columns, [541, 105, 700]);
    expect(resolved[2]).toEqual({
      key: 'billing',
      groupIds: [900],
      isAddOn: true,
      baselineGroupIds: [700],
      borrowedFrom: undefined,
    });
  });

  it('borrows the least privileged login when no login group is free to lend', () => {
    const resolved = resolveLoginBaseline(columns, [541, 105]);
    expect(resolved[2]).toEqual({
      key: 'billing',
      groupIds: [900],
      isAddOn: true,
      baselineGroupIds: [105],
      borrowedFrom: { key: 'web', groupIds: [105] },
    });
  });

  it('leaves an add-on alone when no column can log in at all', () => {
    const resolved = resolveLoginBaseline(columns, []);
    expect(resolved[2]?.baselineGroupIds).toEqual([]);
    expect(resolved[2]?.borrowedFrom).toBeUndefined();
  });
});
