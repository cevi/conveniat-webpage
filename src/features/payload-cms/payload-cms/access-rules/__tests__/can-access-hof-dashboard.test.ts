jest.mock('@/config/environment-variables', () => ({
  environmentVariables: {
    CEVIDB_GROUP_FULL_ADMIN: [541],
    CEVIDB_GROUP_WEB_CORE_TEAM: [105],
    CEVIDB_GROUP_TRANSLATION_TEAM: [106],
    CEVIDB_GROUP_PROGRAM_TEAM: [107],
    CEVIDB_GROUP_MATERIAL_TEAM: [108],
  },
}));

import {
  getAdministeredGroupIds,
  mayOpenHof,
} from '@/features/payload-cms/payload-cms/access-rules/can-access-hof-dashboard';
import { HOF_ADMINISTRATOR_ROLE_CLASS } from '@/features/payload-cms/payload-cms/access-rules/hof-administrator-role';
import type { PayloadRequest } from 'payload';

/** Hof Nord is run by the Cevi.DB group 990001, Hof Süd by 990002. */
const HOEFE = [
  { id: 'hof-nord', name: 'Hof Nord', groupId: '990001' },
  { id: 'hof-sued', name: 'Hof Süd', groupId: '990002' },
];

const requestFor = (groups: { id: number; role_class: string }[]): PayloadRequest => {
  const find = jest.fn(({ where }: { where: { groupId: { in: string[] } } }) =>
    Promise.resolve({ docs: HOEFE.filter((hof) => where.groupId.in.includes(hof.groupId)) }),
  );
  return { user: { id: 'u1', groups }, payload: { find } } as unknown as PayloadRequest;
};

const administrator = (groupId: number): { id: number; role_class: string } => ({
  id: groupId,
  role_class: HOF_ADMINISTRATOR_ROLE_CLASS,
});

describe('getAdministeredGroupIds', () => {
  it('opens the groups the user is address administrator of, as text like a Hof stores them', () => {
    expect(getAdministeredGroupIds([administrator(990_001), administrator(990_002)])).toEqual([
      '990001',
      '990002',
    ]);
  });

  it('does not open a group through any other role in it', () => {
    expect(
      getAdministeredGroupIds([
        { id: 990_001, role_class: 'Group::MitgliederorganisationExterne::Externer' },
        // an Adressverwalter of another kind of group has a role class of its own
        { id: 990_001, role_class: 'Group::Jungschar::Adressverwalter' },
        { id: 541, role_class: 'admin' },
      ]),
    ).toEqual([]);
  });

  it('lists a group once and skips roles without a usable group id', () => {
    expect(
      getAdministeredGroupIds([
        administrator(990_001),
        administrator(990_001),
        { role_class: HOF_ADMINISTRATOR_ROLE_CLASS },
        { id: 0, role_class: HOF_ADMINISTRATOR_ROLE_CLASS },
      ]),
    ).toEqual(['990001']);
  });
});

describe('mayOpenHof', () => {
  it('lets the reviewers open every Hof', async () => {
    await expect(
      mayOpenHof(requestFor([{ id: 105, role_class: 'editor' }]), 'hof-nord'),
    ).resolves.toBe(true);
  });

  it('opens the Hof of the group an address administrator administers, and no other', async () => {
    const request = requestFor([administrator(990_002)]);
    await expect(mayOpenHof(request, 'hof-sued')).resolves.toBe(true);
    await expect(mayOpenHof(request, 'hof-nord')).resolves.toBe(false);
  });

  it('refuses a member of the Hof group without the administrator role', async () => {
    await expect(
      mayOpenHof(
        requestFor([{ id: 990_001, role_class: 'Group::MitgliederorganisationExterne::Externer' }]),
        'hof-nord',
      ),
    ).resolves.toBe(false);
  });

  it('refuses a visitor who is not signed in', async () => {
    await expect(
      mayOpenHof({ user: undefined } as unknown as PayloadRequest, 'hof-nord'),
    ).resolves.toBe(false);
  });
});
