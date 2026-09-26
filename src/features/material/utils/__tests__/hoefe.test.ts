import { findMyHofIds, type HofMembershipKeys } from '@/features/material/utils/hoefe';

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
