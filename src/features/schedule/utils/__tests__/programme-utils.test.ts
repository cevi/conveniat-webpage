import type { CampScheduleEntryFrontendType } from '@/features/schedule/types/types';
import {
  findNowAndNext,
  findOtherSlots,
  findWhatComesNext,
  isDescriptionRedundant,
  isForQuartiere,
  kindOf,
  withClockTimes,
} from '@/features/schedule/utils/programme-utils';

type Entry = Pick<
  CampScheduleEntryFrontendType,
  'id' | 'title' | 'timeslot' | 'kind' | 'quartiere' | 'location' | 'category'
>;

const entry = (
  id: string,
  time: string,
  kind?: Entry['kind'],
  quartiere?: Entry['quartiere'],
): Entry => ({
  id,
  title: id,
  timeslot: { date: '2027-07-25T12:00:00.000Z', time },
  kind,
  quartiere,
  location: 'spielwiese-mitte',
  category: 'lagersport',
});

const at = (time: string): number => {
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

// Sunday of Quartier 1, as the Picasso plans it
const sunday = [
  entry('Essen', '12:45 - 13:15', 'meal'),
  entry('Lagerregeln', '14:00 - 15:00', 'program'),
  entry('Verschiebung', '15:00 - 15:45', 'transfer'),
  entry('Kennenlernspiel', '15:45 - 17:45', 'program'),
  entry('Konzert', '22:30 - 00:00', 'program'),
];

describe('findNowAndNext', () => {
  it('names the running block, how far it is and what follows', () => {
    const result = findNowAndNext(sunday, at('14:24'));

    expect(result.current?.id).toBe('Lagerregeln');
    expect(result.minutesLeft).toBe(36);
    expect(result.progress).toBeCloseTo(0.4);
    expect(result.next?.id).toBe('Kennenlernspiel');
  });

  it('points at the next block while people walk to it, not at the transfer', () => {
    const result = findNowAndNext(sunday, at('15:17'));

    expect(result.current).toBeUndefined();
    expect(result.next?.id).toBe('Kennenlernspiel');
    expect(result.minutesUntilNext).toBe(28);
  });

  it('counts a meal as what is on', () => {
    expect(findNowAndNext(sunday, at('13:00')).current?.id).toBe('Essen');
  });

  it('keeps a block that runs past midnight running until the day ends', () => {
    expect(findNowAndNext(sunday, at('23:50')).current?.id).toBe('Konzert');
  });

  it('has nothing to say before the first entry of an empty day', () => {
    expect(findNowAndNext([], at('10:00'))).toMatchObject({ current: undefined, next: undefined });
  });
});

describe('kindOf', () => {
  it('treats an entry from before the field existed as a programme block', () => {
    expect(kindOf({})).toBe('program');
    expect(kindOf({ kind: 'something-newer' as never })).toBe('program');
  });
});

describe('isForQuartiere', () => {
  const mine = new Set(['q1']);

  it('shows a Quartier its own blocks and those of the whole camp', () => {
    expect(isForQuartiere(entry('a', '09:00 - 10:00', 'program', ['q1', 'q3']), mine)).toBe(true);
    expect(isForQuartiere(entry('b', '09:00 - 10:00', 'program', []), mine)).toBe(true);
    expect(isForQuartiere(entry('c', '09:00 - 10:00'), mine)).toBe(true);
  });

  it('hides the blocks of the other Quartiere', () => {
    expect(isForQuartiere(entry('a', '09:00 - 10:00', 'program', ['q2']), mine)).toBe(false);
    expect(
      isForQuartiere(entry('b', '09:00 - 10:00', 'program', [{ id: 'q2', name: 'Q2' }]), mine),
    ).toBe(false);
  });

  it('does not let a deleted Quartier turn a block into one for the whole camp', () => {
    // eslint-disable-next-line unicorn/no-null -- Payload leaves `null` for a dangling relation
    expect(isForQuartiere(entry('a', '09:00 - 10:00', 'program', [null, 'q2']), mine)).toBe(false);
    // eslint-disable-next-line unicorn/no-null
    expect(isForQuartiere(entry('b', '09:00 - 10:00', 'program', [null]), mine)).toBe(false);
  });
});

describe('withClockTimes', () => {
  it('counts the steps up from the start of the slot', () => {
    const steps = [
      { phase: 'intro' as const, duration: 15, title: 'Gruppen bilden' },
      { phase: 'intro' as const, duration: 20, title: 'Aufwärmen' },
      { phase: 'main' as const, duration: 55, title: 'Völkarten' },
    ];

    expect(withClockTimes(steps, at('15:45')).map(({ startsAt }) => startsAt)).toEqual([
      at('15:45'),
      at('16:00'),
      at('16:20'),
    ]);
    // the same description, in the slot of the Quartiere that play first
    expect(withClockTimes(steps, at('13:45'))[2]?.startsAt).toBe(at('14:20'));
  });
});

describe('withClockTimes and odd durations', () => {
  it('keeps the times on whole minutes when a duration has a fraction', () => {
    const steps = [
      { phase: 'main' as const, duration: 1.5, title: 'kurz' },
      { phase: 'main' as const, duration: 10, title: 'danach' },
    ];

    expect(withClockTimes(steps, 540)[1]?.startsAt).toBe(542);
  });
});

describe('findOtherSlots', () => {
  it('finds the turns of the other Quartiere on the same day', () => {
    const first = { ...entry('1', '13:45 - 15:45', 'program'), title: 'Kennenlernspiel' };
    const second = { ...entry('2', '15:45 - 17:45', 'program'), title: 'Kennenlernspiel' };
    const otherDay = {
      ...entry('3', '13:45 - 15:45', 'program'),
      title: 'Kennenlernspiel',
      timeslot: { date: '2027-07-26T12:00:00.000Z', time: '13:45 - 15:45' },
    };
    const lunch = { ...entry('4', '12:30 - 13:00', 'meal'), title: 'Kennenlernspiel' };
    const elsewhere = {
      ...entry('5', '13:45 - 15:45', 'program'),
      title: 'Kennenlernspiel',
      location: 'buehne',
    };

    expect(
      findOtherSlots([first, second, otherDay, lunch, elsewhere], second).map(({ id }) => id),
    ).toEqual(['1']);
  });
});

const richText = (text: string): unknown => ({
  root: {
    type: 'root',
    version: 1,
    children: [{ type: 'paragraph', version: 1, children: [{ type: 'text', version: 1, text }] }],
  },
});

describe('isDescriptionRedundant', () => {
  it('hides a description that only repeats the title', () => {
    expect(isDescriptionRedundant(richText('Ballspiele.'), 'Ballspiele')).toBe(true);
    expect(isDescriptionRedundant(richText('  ballspiele  '), 'Ballspiele')).toBe(true);
  });

  it('hides an empty or unreadable description', () => {
    expect(isDescriptionRedundant(richText(''), 'Ballspiele')).toBe(true);
    // a draft skips validation and can leave the description empty
    // eslint-disable-next-line unicorn/no-null
    expect(isDescriptionRedundant(null, 'Ballspiele')).toBe(true);
  });

  it('keeps a description that says more', () => {
    expect(isDescriptionRedundant(richText('Ballspiele für alle Stufen.'), 'Ballspiele')).toBe(
      false,
    );
  });
});

describe('findWhatComesNext', () => {
  const mine = new Set(['q5']);
  const ballspiele = entry('ballspiele', '17:00 - 17:30', 'program', [{ id: 'q5', name: 'Q5' }]);

  it('names the meal that follows and the block after it, on the own timeline', () => {
    const { next, nextBlock } = findWhatComesNext(
      [
        ballspiele,
        entry('walk', '17:45 - 18:00', 'transfer', [{ id: 'q5', name: 'Q5' }]),
        entry('essen-q1', '17:30 - 18:00', 'meal', [{ id: 'q1', name: 'Q1' }]),
        entry('essen', '18:00 - 18:30', 'meal', [{ id: 'q5', name: 'Q5' }]),
        entry('freies-spiel', '18:45 - 19:30', 'program', [{ id: 'q5', name: 'Q5' }]),
        entry('feier', '20:15 - 21:45', 'program'),
      ],
      ballspiele,
      mine,
    );

    expect(next?.id).toBe('essen');
    expect(nextBlock?.id).toBe('freies-spiel');
  });

  it('has nothing to say after the last stop of the day', () => {
    expect(findWhatComesNext([ballspiele], ballspiele, mine)).toEqual({
      next: undefined,
      nextBlock: undefined,
    });
  });
});
