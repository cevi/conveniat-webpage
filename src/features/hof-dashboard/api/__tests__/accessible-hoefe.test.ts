jest.mock('@/config/environment-variables', () => ({
  environmentVariables: {
    CEVIDB_GROUP_FULL_ADMIN: [541],
    CEVIDB_GROUP_WEB_CORE_TEAM: [105],
    CEVIDB_GROUP_TRANSLATION_TEAM: [106],
    CEVIDB_GROUP_PROGRAM_TEAM: [107],
    CEVIDB_GROUP_MATERIAL_TEAM: [108],
  },
}));
jest.mock('@/utils/server-logger', () => ({
  createLogger: (): Record<string, jest.Mock> => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

import { listAccessibleHoefe } from '@/features/hof-dashboard/api/accessible-hoefe';
import { HOF_ADMINISTRATOR_ROLE_CLASS } from '@/features/payload-cms/payload-cms/access-rules/hof-administrator-role';
import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';
import type { Payload } from 'payload';

const HOEFE = [
  { id: 'hof-sued', name: 'Hof Süd', groupId: '990002' },
  { id: 'hof-nord', name: 'Hof Nord', groupId: '990001' },
  { id: 'hof-ost', name: 'Hof Ost', groupId: '990003' },
];

/** A Payload with the Höfe above and one user, whose Cevi.DB roles the login stored. */
const payloadWith = (
  roles: { id: number; role_class: string }[],
): Pick<Payload, 'find' | 'findByID'> =>
  ({
    findByID: jest.fn(() => Promise.resolve({ groups: roles })),
    find: jest.fn(({ where }: { where?: { groupId: { in: string[] } } }) =>
      Promise.resolve({
        docs: HOEFE.filter((hof) => where === undefined || where.groupId.in.includes(hof.groupId)),
      }),
    ),
  }) as unknown as Pick<Payload, 'find' | 'findByID'>;

const sessionUser = (groupIds: number[]): HitobitoNextAuthUser => ({
  uuid: 'user-1',
  group_ids: groupIds,
  email: 'person@example.com',
  name: 'Person',
});

describe('listAccessibleHoefe', () => {
  it('opens the Höfe of the groups the user is address administrator of, by name', async () => {
    const payload = payloadWith([
      { id: 990_002, role_class: HOF_ADMINISTRATOR_ROLE_CLASS },
      { id: 990_001, role_class: HOF_ADMINISTRATOR_ROLE_CLASS },
      { id: 990_003, role_class: 'Group::MitgliederorganisationExterne::Externer' },
    ]);
    const hoefe = await listAccessibleHoefe(payload, sessionUser([990_001, 990_002, 990_003]));
    expect(hoefe.map((hof) => hof.name)).toEqual(['Hof Nord', 'Hof Süd']);
  });

  it('opens nothing for a participant, and does not list the Höfe at all', async () => {
    const payload = payloadWith([
      { id: 990_001, role_class: 'Group::MitgliederorganisationExterne::Externer' },
    ]);
    await expect(listAccessibleHoefe(payload, sessionUser([990_001]))).resolves.toEqual([]);
    expect(payload.find).not.toHaveBeenCalled();
  });

  it('opens every Hof for a reviewer', async () => {
    const hoefe = await listAccessibleHoefe(payloadWith([]), sessionUser([105]));
    expect(hoefe).toHaveLength(3);
  });
});
