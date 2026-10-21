import type { CampScheduleEntryFrontendType } from '@/features/schedule/types/types';
import { isForQuartiere } from '@/features/schedule/utils/programme-utils';
import type { TimelineItem } from '@/features/schedule/utils/timeline';
import { buildTimeline } from '@/features/schedule/utils/timeline';

const emptyRichText = {
  root: { type: 'root', format: '', indent: 0, version: 1, children: [] },
} as unknown as CampScheduleEntryFrontendType['description'];

const q = (number: number): { id: string; name: string; number: number } => ({
  id: `q${number}`,
  name: `Quartier ${number}`,
  number,
});
const place = (title: string): CampScheduleEntryFrontendType['location'] =>
  ({ id: title, title }) as unknown as CampScheduleEntryFrontendType['location'];
const sport = { id: 'lagersport', title: 'Lagersport', colorTheme: 'blue' } as never;

let counter = 0;
const entry = (
  title: string,
  time: string,
  kind: 'program' | 'meal' | 'fixpoint' | 'transfer',
  quartiere: number[] = [],
  extra: Partial<CampScheduleEntryFrontendType> = {},
): CampScheduleEntryFrontendType => ({
  id: `${title}-${time}-${++counter}`,
  title,
  description: emptyRichText,
  timeslot: { date: '2027-07-24T12:00:00.000Z', time },
  location: place(kind === 'program' ? 'Spielwiese Mitte' : 'Lagerplatz'),
  kind,
  quartiere: quartiere.map((number) => q(number)),
  ...(kind === 'program' ? { category: sport } : {}),
  ...extra,
});

// 24 July 2027 as the programme has it, abridged
const day = [
  entry('Anreise', '08:30 - 12:30', 'fixpoint'),
  entry('Anreise oder Hofprogramm', '13:30 - 17:00', 'fixpoint'),
  entry('Ballspiele', '17:00 - 18:00', 'program', [7, 8]),
  entry('Ballspiele', '17:00 - 17:30', 'program', [4, 5, 6]),
  entry('Verschiebung', '17:15 - 17:30', 'transfer', [1, 2, 3]),
  entry('Essen', '17:30 - 18:00', 'meal', [1, 2, 3]),
  entry('Verschiebung', '17:45 - 18:00', 'transfer', [4, 5, 6]),
  entry('Essen', '18:00 - 18:30', 'meal', [4, 5, 6]),
  entry('Essen', '18:30 - 19:00', 'meal', [7, 8]),
  entry('Freies Spiel', '18:15 - 19:30', 'program', [1, 2, 3]),
  entry('Verschiebung', '18:30 - 18:45', 'transfer', [4, 5, 6]),
  entry('Freies Spiel', '18:45 - 19:30', 'program', [4, 5, 6]),
  entry('Freies Spiel', '19:15 - 19:45', 'program', [7, 8]),
  entry('Eröffnungsfeier', '20:15 - 21:45', 'program', [], { location: place('Bühne') }),
  entry('Verschiebung', '21:45 - 22:15', 'transfer'),
  entry('Nachtruhe', '22:15 - 22:30', 'fixpoint'),
];

/** "Ballspiele ×2" for a stop of two slots, "→ Essen 15" for a transfer of 15 minutes */
const describe_ = (items: TimelineItem[]): string[] =>
  items.map((item) => {
    if (item.type === 'transfer') {
      return `→ ${item.to?.title ?? 'Tagesende'} ${item.perQuartier ? 'je nach Quartier' : String(item.minutes)}`;
    }
    return item.slots.length > 1
      ? `${item.slots[0].title} ×${item.slots.length}`
      : `${item.slots[0].title}`;
  });

describe('buildTimeline', () => {
  it('draws the day of one Quartier with the walks on the rail, not as entries', () => {
    const mine = day.filter((item) => isForQuartiere(item, new Set(['q5'])));

    expect(describe_(buildTimeline(mine, { groupSlots: false }))).toEqual([
      'Anreise',
      'Anreise oder Hofprogramm',
      'Ballspiele',
      '→ Essen 15',
      'Essen',
      '→ Freies Spiel 15',
      'Freies Spiel',
      'Eröffnungsfeier',
      '→ Nachtruhe 30',
      'Nachtruhe',
    ]);
  });

  it('shows each block once for the whole camp, with a slot per Quartier', () => {
    const items = buildTimeline(day, { groupSlots: true });

    const ballspiele = items.find((item) => item.slots[0].title === 'Ballspiele');
    expect(ballspiele?.slots.map(({ timeslot }) => timeslot.time)).toEqual([
      '17:00 - 17:30',
      '17:00 - 18:00',
    ]);

    expect(describe_(items)).toEqual([
      'Anreise',
      'Anreise oder Hofprogramm',
      'Ballspiele ×2',
      '→ Essen je nach Quartier',
      'Essen ×3',
      '→ Freies Spiel je nach Quartier',
      'Freies Spiel ×3',
      '→ Eröffnungsfeier je nach Quartier',
      'Eröffnungsfeier',
      '→ Nachtruhe 30',
      'Nachtruhe',
    ]);
  });

  it('keeps breakfast and supper apart, even when they share a name', () => {
    const items = buildTimeline(
      [
        entry('Essen', '07:30 - 08:00', 'meal', [1]),
        entry('Essen', '08:00 - 08:30', 'meal', [2]),
        entry('Essen', '12:00 - 12:30', 'meal', [1]),
      ],
      { groupSlots: true },
    );

    expect(describe_(items)).toEqual(['Essen ×2', 'Essen']);
  });

  it('never makes one Quartier take two slots of the same block', () => {
    const items = buildTimeline(
      [
        entry('Turnierformen', '09:30 - 11:30', 'program', [1, 2]),
        entry('Turnierformen', '13:45 - 15:45', 'program', [2, 3]),
      ],
      { groupSlots: true },
    );

    expect(describe_(items)).toEqual(['Turnierformen', 'Turnierformen']);
  });

  it('does not group blocks at another place', () => {
    const items = buildTimeline(
      [
        entry('Ballspiele', '17:00 - 17:30', 'program', [4]),
        entry('Ballspiele', '17:00 - 17:30', 'program', [5], { location: place('Spielwiese Ost') }),
      ],
      { groupSlots: true },
    );

    expect(describe_(items)).toEqual(['Ballspiele', 'Ballspiele']);
  });
});

describe('buildTimeline at the end of the day', () => {
  it('keeps the walk after the last stop', () => {
    const items = buildTimeline(
      [
        entry('Eröffnungsfeier', '20:15 - 21:45', 'program'),
        entry('Verschiebung', '21:45 - 22:15', 'transfer'),
      ],
      { groupSlots: false },
    );

    expect(describe_(items)).toEqual(['Eröffnungsfeier', '→ Tagesende 30']);
  });
});
