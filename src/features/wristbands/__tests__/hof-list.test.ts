import {
  bandProgress,
  readWristbandList,
  stationList,
  withBandAssigned,
  withBandReturned,
  withHelper,
  withSpareBand,
} from '@/features/wristbands/hof-list';
import { scanFailureKind } from '@/features/wristbands/scan-failure';
import type { HofPerson, HofWristbandList } from '@/features/wristbands/types';

const person = (
  registrationId: string,
  fullName: string,
  abteilung: string | null,
  extra: Partial<HofPerson> = {},
): HofPerson => ({
  registrationId,
  fullName,
  nickname: null,
  abteilung,
  role: 'participant',
  band: null,
  helper: false,
  ...extra,
});

const BAND = '04A1B2C3D4E5F6';
const SPARE = '04112233445566';

/** A Hof of two Abteilungen, listed out of order. */
const people: HofPerson[] = [
  person('zoe', 'Zoe Wyss', 'Cevi Uster'),
  person('tim', 'Tim Huber', 'Cevi Wetzikon', { role: 'leader' }),
  person('lea', 'Lea Meier', 'Cevi Uster', {
    nickname: 'Fuchs',
    band: { uid: BAND, status: 'active' },
  }),
  person('anna', 'Anna Keller', 'Cevi Wetzikon'),
  person('ben', 'Ben Frei', 'Cevi Uster'),
  person('nora', 'Nora Graf', null),
];

const groupsOf = (search: string): [string | null, string[]][] =>
  stationList(people, search).groups.map((group) => [
    group.abteilung,
    group.people.map((entry) => entry.registrationId),
  ]);

describe('the station list', () => {
  it('lists who still needs a band by Abteilung and name, the way the AVP calls them up', () => {
    expect(groupsOf('')).toEqual([
      ['Cevi Uster', ['ben', 'zoe']],
      ['Cevi Wetzikon', ['anna', 'tim']],
      // a registration without an Abteilung comes last
      [null, ['nora']],
    ]);
  });

  it('finds everyone by name or Ceviname, a person with a band too, those without one first', () => {
    expect(groupsOf('fuchs')).toEqual([[null, ['lea']]]);
    expect(groupsOf('e')).toEqual([[null, ['anna', 'ben', 'tim', 'zoe', 'lea']]]);
    expect(stationList(people, '  ').searching).toBe(false);
  });

  it('finds nobody for a name nobody of the Hof has, and lists nobody once all wear a band', () => {
    expect(groupsOf('xaver')).toEqual([]);
    const everyone = people.map((entry) => ({
      ...entry,
      band: { uid: entry.registrationId, status: 'active' as const },
    }));
    expect(stationList(everyone, '').groups).toEqual([]);
  });

  it('counts who wears a band', () => {
    expect(bandProgress(people)).toEqual({ withBand: 1, total: 6 });
  });
});

describe('the list in the cache', () => {
  const list: HofWristbandList = {
    people: people.slice(0, 3),
    spareBands: [{ uid: SPARE, status: 'active' }],
  };

  it('hands a spare band to a person, and an undo makes it a spare again', () => {
    const assigned = withBandAssigned(list, SPARE, 'zoe');
    expect(assigned.people.find((entry) => entry.registrationId === 'zoe')?.band?.uid).toBe(SPARE);
    expect(assigned.spareBands).toEqual([]);

    const returned = withBandReturned(assigned, SPARE);
    expect(returned.people.every((entry) => entry.band?.uid !== SPARE)).toBe(true);
    expect(returned.spareBands).toEqual([{ uid: SPARE, status: 'active' }]);
  });

  it('gives a person a new band in place of their lost one', () => {
    const replaced = withBandAssigned(list, SPARE, 'lea');
    expect(replaced.people.find((entry) => entry.registrationId === 'lea')?.band).toEqual({
      uid: SPARE,
      status: 'active',
    });
  });

  it('keeps a band the phone recorded but nobody got as a spare once, not one somebody wears', () => {
    const recorded = withSpareBand(withSpareBand(list, '04000000000001'), '04000000000001');
    expect(recorded.spareBands).toHaveLength(2);
    expect(withSpareBand(list, BAND)).toBe(list);
  });

  it('names a helper and takes it back', () => {
    const named = withHelper(list, 'tim', true);
    expect(
      named.people.filter((entry) => entry.helper).map((entry) => entry.registrationId),
    ).toEqual(['tim']);
    expect(withHelper(named, 'tim', false).people.some((entry) => entry.helper)).toBe(false);
  });

  it('reads a list from an older persisted cache without its new fields', () => {
    const old: unknown = {
      people: [{ registrationId: 'lea', fullName: 'Lea Meier', nickname: 'Fuchs', band: null }],
    };
    expect(readWristbandList(old)).toEqual({
      people: [
        {
          registrationId: 'lea',
          fullName: 'Lea Meier',
          nickname: 'Fuchs',
          abteilung: null,
          role: 'participant',
          band: null,
          helper: false,
        },
      ],
      spareBands: [],
    });
    expect(readWristbandList(null)).toEqual({ people: [], spareBands: [] });
  });
});

describe('the scanner after a failed band', () => {
  it('asks to hold a band again that slipped, also Android’s "transceive fail"', () => {
    for (const code of ['tag-lost', 'tap-again', 'unsupported-tag'] as const) {
      expect(scanFailureKind(code)).toBe('again');
    }
  });

  it('refuses a band that cannot be used here and keeps scanning for the next', () => {
    for (const code of ['aborted', 'wrong-password', 'tag-locked'] as const) {
      expect(scanFailureKind(code)).toBe('refused');
    }
  });

  it('stops after a minute without a band, and with NFC off', () => {
    expect(scanFailureKind('timeout')).toBe('stop');
    expect(scanFailureKind('disabled')).toBe('stop');
  });
});
