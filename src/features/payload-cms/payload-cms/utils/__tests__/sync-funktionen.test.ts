jest.mock('@/features/payload-cms/payload-cms/utils/funktionen', () => ({
  refreshUserFunktionen: jest.fn().mockResolvedValue(0),
}));

import {
  LEITUNG_ROLE_CLASS,
  syncFunktionen,
  type FunktionenSource,
} from '@/features/payload-cms/payload-cms/utils/sync-funktionen';
import type { Payload } from 'payload';

interface StoredFunktion {
  id: string;
  groupId: string;
  groupName: string;
  personIds: string[];
  label?: string;
}

/** The Projektleitung 4046 with two Ressorts, one of them with a team of its own. */
const TREE: Record<string, { name: string; children: string[]; leaders: string[] }> = {
  '4046': { name: 'Projektleitung', children: ['5001', '5002'], leaders: ['11'] },
  '5001': { name: 'Ressort Infrastruktur', children: ['6001'], leaders: ['12', '13'] },
  '5002': { name: 'Ressort Programm', children: [], leaders: [] },
  '6001': { name: 'Team Strom', children: [], leaders: ['14'] },
};

const source = (overrides: Partial<FunktionenSource> = {}): FunktionenSource => ({
  getGroupName: jest.fn((id: string) => Promise.resolve(TREE[id]?.name ?? '')),
  listSubgroups: jest.fn((id: string) =>
    Promise.resolve(
      (TREE[id]?.children ?? []).map((child) => ({ id: child, name: TREE[child]?.name ?? '' })),
    ),
  ),
  listPeopleWithRole: jest.fn((id: string, roleClass: string) =>
    Promise.resolve(
      roleClass === LEITUNG_ROLE_CLASS
        ? (TREE[id]?.leaders ?? []).map((personId) => ({
            personId,
            email: '',
            firstName: '',
            lastName: '',
            nickname: '',
          }))
        : [],
    ),
  ),
  ...overrides,
});

/** A Payload holding the given functions in memory, and its write mocks. */
const fakePayload = (
  stored: StoredFunktion[],
): { payload: Payload; create: jest.Mock; delete: jest.Mock } => {
  let nextId = 0;
  const create = jest.fn(({ data }: { data: Omit<StoredFunktion, 'id'> }) => {
    stored.push({ id: `new-${String((nextId += 1))}`, ...data });
    return Promise.resolve();
  });
  const remove = jest.fn(({ id }: { id: string }) => {
    stored.splice(
      stored.findIndex((candidate) => candidate.id === id),
      1,
    );
    return Promise.resolve();
  });
  const payload = {
    find: jest.fn(() => Promise.resolve({ docs: stored.map((funktion) => ({ ...funktion })) })),
    create,
    update: jest.fn(({ id, data }: { id: string; data: Partial<StoredFunktion> }) => {
      const funktion = stored.find((candidate) => candidate.id === id);
      if (funktion !== undefined) Object.assign(funktion, data);
      return Promise.resolve();
    }),
    delete: remove,
  } as unknown as Payload;
  return { payload, create, delete: remove };
};

describe('syncFunktionen', () => {
  it('makes every group of the whole tree with a leader a function held by its leaders', async () => {
    const stored: StoredFunktion[] = [];
    const result = await syncFunktionen(fakePayload(stored).payload, source(), '4046');

    expect(result).toMatchObject({ groups: 4, created: 3, removed: 0 });
    expect(stored.map(({ groupId, personIds, label }) => ({ groupId, personIds, label }))).toEqual([
      { groupId: '4046', personIds: ['11'], label: 'Leitung Projektleitung' },
      { groupId: '5001', personIds: ['12', '13'], label: 'Leitung Ressort Infrastruktur' },
      { groupId: '6001', personIds: ['14'], label: 'Leitung Team Strom' },
    ]);
  });

  it('keeps the label an editor gave and follows a new leader', async () => {
    const stored: StoredFunktion[] = [
      {
        id: 'infra',
        groupId: '5001',
        groupName: 'Ressort Infrastruktur',
        personIds: ['99'],
        label: 'Ressortleitung Infrastruktur',
      },
    ];
    await syncFunktionen(fakePayload(stored).payload, source(), '4046');

    expect(stored.find(({ id }) => id === 'infra')).toMatchObject({
      personIds: ['12', '13'],
      label: 'Ressortleitung Infrastruktur',
    });
  });

  it('removes the function of a group that lost its leaders or left the tree', async () => {
    const stored: StoredFunktion[] = [
      { id: 'programm', groupId: '5002', groupName: 'Ressort Programm', personIds: ['20'] },
      { id: 'gone', groupId: '7777', groupName: 'Aufgelöst', personIds: ['21'] },
    ];
    const result = await syncFunktionen(fakePayload(stored).payload, source(), '4046');

    expect(result.removed).toBe(2);
    expect(stored.map(({ id }) => id)).not.toContain('programm');
    expect(stored.map(({ id }) => id)).not.toContain('gone');
  });

  it('changes nothing when Cevi.DB fails halfway through the tree', async () => {
    const stored: StoredFunktion[] = [
      { id: 'infra', groupId: '5001', groupName: 'Ressort Infrastruktur', personIds: ['12'] },
    ];
    const fake = fakePayload(stored);
    const failing = source({
      listPeopleWithRole: jest.fn((id: string) =>
        id === '6001' ? Promise.reject(new Error('Cevi.DB timeout')) : Promise.resolve([]),
      ),
    });

    await expect(syncFunktionen(fake.payload, failing, '4046')).rejects.toThrow('Cevi.DB timeout');
    expect(fake.create).not.toHaveBeenCalled();
    expect(fake.delete).not.toHaveBeenCalled();
    expect(stored).toHaveLength(1);
  });

  it('refuses to remove every function when Cevi.DB suddenly shows no leader at all', async () => {
    const stored: StoredFunktion[] = [
      { id: 'infra', groupId: '5001', groupName: 'Ressort Infrastruktur', personIds: ['12'] },
    ];
    const fake = fakePayload(stored);
    const empty = source({ listPeopleWithRole: jest.fn(() => Promise.resolve([])) });

    await expect(syncFunktionen(fake.payload, empty, '4046')).rejects.toThrow(
      'refusing to remove all 1 functions',
    );
    expect(fake.delete).not.toHaveBeenCalled();
  });
});

describe('syncFunktionen progress', () => {
  it('reports the walk of the tree, then every group read, with the groups that have leaders', async () => {
    const reports: unknown[] = [];
    await syncFunktionen(fakePayload([]).payload, source(), '4046', (progress) => {
      reports.push(progress);
    });

    expect(reports.at(0)).toEqual({ phase: 'discovering', discoveredGroups: 3 });
    const reading = reports.filter(
      (report): report is { phase: 'reading'; processedGroups: number; found: unknown[] } =>
        (report as { phase: string }).phase === 'reading',
    );
    expect(reading.map((report) => report.processedGroups)).toEqual([1, 2, 3, 4]);
    expect(reading.flatMap((report) => report.found)).toEqual([
      { groupId: '4046', groupName: 'Projektleitung', leaders: 1 },
      { groupId: '5001', groupName: 'Ressort Infrastruktur', leaders: 2 },
      { groupId: '6001', groupName: 'Team Strom', leaders: 1 },
    ]);
  });
});
