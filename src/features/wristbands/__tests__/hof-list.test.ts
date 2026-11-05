import type { QueueOrder } from '@/features/wristbands/queue';
import {
  abteilungenOf,
  bandProgress,
  buildQueue,
  EMPTY_ORDER,
  filterPeople,
  NO_FILTERS,
  pruneOrder,
  putFirst,
  readWristbandList,
  skipPerson,
  withBandAssigned,
  withBandReturned,
  withSpareBand,
} from '@/features/wristbands/queue';
import { scanFailureKind } from '@/features/wristbands/scan-failure';
import { isSeriesBandDone, recordSeriesBand } from '@/features/wristbands/series';
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
  ...extra,
});

const BAND = '04A1B2C3D4E5F6';
const SPARE = '04112233445566';

/** A Hof of two Abteilungen, listed out of order. */
const people: HofPerson[] = [
  person('zoe', 'Zoe Wyss', 'Cevi Uster'),
  person('tim', 'Tim Huber', 'Cevi Wetzikon', { role: 'leader' }),
  person('lea', 'Lea Meier', 'Cevi Uster', { band: { uid: BAND, status: 'active' } }),
  person('anna', 'Anna Keller', 'Cevi Wetzikon'),
  person('ben', 'Ben Frei', 'Cevi Uster'),
  person('nora', 'Nora Graf', null),
];

const names = (entries: HofPerson[]): string[] => entries.map((entry) => entry.registrationId);
const lineOf = (order: QueueOrder = EMPTY_ORDER, filters = NO_FILTERS): string[] => {
  const queue = buildQueue(people, filters, order);
  return queue.current === undefined
    ? []
    : names([queue.current, ...buildQueue(people, filters, order).next]);
};

describe('the queue', () => {
  it('lines up the people without a band by Abteilung, then by name, nobody’s Abteilung last', () => {
    const queue = buildQueue(people, NO_FILTERS, EMPTY_ORDER);
    expect(queue.current?.registrationId).toBe('ben');
    expect(names(queue.next)).toEqual(['zoe', 'anna', 'tim']);
    expect(queue.waiting).toBe(5);
  });

  it('follows the filters by Abteilung and by role', () => {
    expect(lineOf(EMPTY_ORDER, { abteilung: 'Cevi Wetzikon', role: 'all' })).toEqual([
      'anna',
      'tim',
    ]);
    expect(lineOf(EMPTY_ORDER, { abteilung: null, role: 'leader' })).toEqual(['tim']);
    expect(lineOf(EMPTY_ORDER, { abteilung: 'Cevi Uster', role: 'leader' })).toEqual([]);
  });

  it('moves a skipped person to the end and lists them under "Übersprungen"', () => {
    const order = skipPerson(EMPTY_ORDER, 'ben');
    const queue = buildQueue(people, NO_FILTERS, order);
    expect(queue.current?.registrationId).toBe('zoe');
    expect(names(queue.skipped)).toEqual(['ben']);
    // once everybody else has a band, the skipped ones are up, in the order they were skipped
    const twice = skipPerson(order, 'zoe');
    const rest = people.map((entry) =>
      ['ben', 'zoe'].includes(entry.registrationId)
        ? entry
        : { ...entry, band: { uid: entry.registrationId, status: 'active' as const } },
    );
    const end = buildQueue(rest, NO_FILTERS, twice);
    expect(end.current?.registrationId).toBe('ben');
    expect(names(end.skipped)).toEqual(['zoe']);
  });

  it('brings a skipped person back to the front', () => {
    const order = putFirst(skipPerson(EMPTY_ORDER, 'anna'), 'anna');
    expect(order.skipped).toEqual([]);
    expect(lineOf(order)[0]).toBe('anna');
  });

  it('puts a person chosen by name first, whatever the filters', () => {
    const order = putFirst(EMPTY_ORDER, 'nora');
    expect(lineOf(order, { abteilung: 'Cevi Uster', role: 'all' })).toEqual(['nora', 'ben', 'zoe']);
  });

  it('puts the person whose band was undone first again, the last undone first', () => {
    const order = putFirst(putFirst(EMPTY_ORDER, 'tim'), 'anna');
    expect(lineOf(order).slice(0, 2)).toEqual(['anna', 'tim']);
  });

  it('never queues somebody who wears a band, even when put first', () => {
    const order = putFirst(EMPTY_ORDER, 'lea');
    expect(lineOf(order)).not.toContain('lea');
    expect(pruneOrder(skipPerson(order, 'lea'), people)).toEqual(EMPTY_ORDER);
  });

  it('has nobody up once everybody wears a band', () => {
    const everybody = people.map((entry) => ({
      ...entry,
      band: { uid: entry.registrationId, status: 'active' as const },
    }));
    expect(buildQueue(everybody, NO_FILTERS, EMPTY_ORDER)).toEqual({
      current: undefined,
      next: [],
      skipped: [],
      waiting: 0,
    });
  });
});

describe('the list of people', () => {
  it('filters by band, by search on name and Ceviname, in the order of the queue', () => {
    const withCeviname = [
      ...people,
      person('mia', 'Mia Brunner', 'Cevi Uster', { nickname: 'Wiesel' }),
    ];
    expect(names(filterPeople(withCeviname, { ...NO_FILTERS, band: 'with', search: '' }))).toEqual([
      'lea',
    ]);
    expect(
      names(filterPeople(withCeviname, { ...NO_FILTERS, band: 'all', search: 'wies' })),
    ).toEqual(['mia']);
    expect(
      names(
        filterPeople(withCeviname, {
          abteilung: 'Cevi Uster',
          role: 'all',
          band: 'without',
          search: '',
        }),
      ),
    ).toEqual(['ben', 'mia', 'zoe']);
  });

  it('names the Abteilungen of the Hof and counts who wears a band', () => {
    expect(abteilungenOf(people)).toEqual(['Cevi Uster', 'Cevi Wetzikon']);
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

  it('records a newly programmed band as a spare once, and not one somebody wears', () => {
    const programmed = withSpareBand(withSpareBand(list, '04000000000001'), '04000000000001');
    expect(programmed.spareBands).toHaveLength(2);
    expect(withSpareBand(list, BAND)).toBe(list);
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
        },
      ],
      spareBands: [],
    });
    expect(readWristbandList(null)).toEqual({ people: [], spareBands: [] });
  });
});

describe('"Nur programmieren"', () => {
  it('numbers the bands in the order they were first held, a retried one keeps its number', () => {
    let run = recordSeriesBand([], 'A', 'done');
    run = recordSeriesBand(run, 'B', 'again');
    run = recordSeriesBand(run, 'B', 'done');
    run = recordSeriesBand(run, 'A', 'refused');
    expect(run).toEqual([
      { number: 1, uid: 'A', state: 'done' },
      { number: 2, uid: 'B', state: 'done' },
    ]);
    expect(isSeriesBandDone(run, 'A')).toBe(true);
    expect(isSeriesBandDone(run, 'C')).toBe(false);
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
