import {
  findMyHofIds,
  refreshUserHoefe,
  type HofMembershipKeys,
} from '@/features/payload-cms/payload-cms/utils/hof-membership';
import type { Payload } from 'payload';

const HOEFE: HofMembershipKeys[] = [
  { id: 'nord', groupId: '990001', eventIds: ['991001'] },
  { id: 'sued', groupId: '990002', eventIds: ['991002', '991003'] },
  { id: 'ost', groupId: '990003', eventIds: [] },
];

describe('findMyHofIds', () => {
  it('finds a Hof through its Cevi.DB group, a number in the session', () => {
    expect(findMyHofIds(HOEFE, [102, 990_002], [])).toEqual(['sued']);
  });

  it('finds a Hof through a registration for any of its events', () => {
    expect(findMyHofIds(HOEFE, [], ['991003'])).toEqual(['sued']);
  });

  it('joins leading one Hof and being registered for another, once each', () => {
    expect(findMyHofIds(HOEFE, [990_001], ['991001', '991002'])).toEqual(['nord', 'sued']);
  });

  it('matches ids an editor typed with spaces or a leading zero', () => {
    const hoefe = [{ id: 'west', groupId: ' 0990004', eventIds: ['0991005 '] }];
    expect(findMyHofIds(hoefe, [990_004], [])).toEqual(['west']);
    expect(findMyHofIds(hoefe, [], ['991005'])).toEqual(['west']);
  });

  it('finds nothing without a group or a registration', () => {
    expect(findMyHofIds(HOEFE, [102], ['123'])).toEqual([]);
  });

  it('does not let malformed ids match each other', () => {
    const hoefe = [{ id: 'broken', groupId: 'abc', eventIds: ['', 'x'] }];
    expect(findMyHofIds(hoefe, [], ['', 'x', 'abc'])).toEqual([]);
  });
});

interface FakeUser {
  id: string;
  cevi_db_uuid: number;
  hoefe: string[];
}

/** A Payload that knows the seeded Höfe, the given users and registrations, and records writes. */
const fakePayload = (
  users: FakeUser[],
  registrations: { userId: string; eventId: string }[],
): { payload: Payload; writes: { id: string; hoefe: string[] }[] } => {
  const writes: { id: string; hoefe: string[] }[] = [];
  const hoefe = HOEFE.map((hof) => ({
    id: hof.id,
    groupId: hof.groupId,
    events: hof.eventIds.map((eventId) => ({ eventId })),
  }));
  const payload = {
    find: jest.fn(({ collection }: { collection: string }) => {
      if (collection === 'hoefe') return { docs: hoefe };
      if (collection === 'users') return { docs: users };
      return { docs: registrations };
    }),
    update: jest.fn(({ id, data }: { id: string; data: { hoefe: string[] } }) => {
      writes.push({ id, hoefe: data.hoefe });
    }),
  } as unknown as Payload;
  return { payload, writes };
};

describe('refreshUserHoefe', () => {
  it('gives a user the Höfe of the events they are registered for', async () => {
    const { payload, writes } = fakePayload(
      [{ id: 'anna', cevi_db_uuid: 7, hoefe: [] }],
      [
        { userId: '7', eventId: '991001' },
        { userId: '7', eventId: '991003' },
      ],
    );
    await expect(refreshUserHoefe(payload)).resolves.toBe(1);
    expect(writes).toEqual([{ id: 'anna', hoefe: ['nord', 'sued'] }]);
  });

  it('writes nobody whose Höfe are already right, whatever their order', async () => {
    const { payload, writes } = fakePayload(
      [{ id: 'anna', cevi_db_uuid: 7, hoefe: ['sued', 'nord'] }],
      [
        { userId: '7', eventId: '991001' },
        { userId: '7', eventId: '991002' },
      ],
    );
    await expect(refreshUserHoefe(payload)).resolves.toBe(0);
    expect(writes).toEqual([]);
  });

  it('takes a user out of a Hof once they have no registration left for it', async () => {
    const { payload, writes } = fakePayload([{ id: 'ben', cevi_db_uuid: 8, hoefe: ['nord'] }], []);
    await refreshUserHoefe(payload, { ceviIds: [8] });
    expect(writes).toEqual([{ id: 'ben', hoefe: [] }]);
  });

  it('does not look anything up for an empty list of people', async () => {
    const { payload } = fakePayload([], []);
    await expect(refreshUserHoefe(payload, { ceviIds: [] })).resolves.toBe(0);
    expect(payload.find).not.toHaveBeenCalled();
  });
});
