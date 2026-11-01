import { selectJetzt } from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/dashboard/utils/select-jetzt';

const entry = (
  id: string,
  time: string,
  quartiere: string[] = [],
  kind: 'program' | 'transfer' | 'meal' = 'program',
): {
  id: string;
  timeslot: { date: string; time: string };
  kind: 'program' | 'transfer' | 'meal';
  quartiere: string[];
} => ({ id, timeslot: { date: '2027-07-24T00:00:00.000Z', time }, kind, quartiere });

// 17:12 on the camp's clock, summer time
const now = new Date('2027-07-24T15:12:00Z');

describe('selectJetzt', () => {
  const entries = [
    entry('ballspiele-q5', '17:00 - 17:30', ['q5']),
    entry('ballspiele-q7', '17:00 - 18:00', ['q7']),
    entry('walk', '17:30 - 17:40', ['q5'], 'transfer'),
    entry('essen', '17:30 - 18:15', [], 'meal'),
    entry('spiel', '18:15 - 19:00', ['q5']),
    entry('abend', '20:00 - 21:00'),
  ];

  it('leads with the block of the own Quartier running now', () => {
    const jetzt = selectJetzt(entries, new Set(['q5']), now, 2);
    expect(jetzt.lead?.id).toBe('ballspiele-q5');
    expect(jetzt.isRunning).toBe(true);
    expect(jetzt.minutes).toBe(18);
    expect(jetzt.later.map(({ id }) => id)).toEqual(['essen', 'spiel']);
  });

  it('shows a guest the Gesamtlager only, with the next block when nothing runs', () => {
    const jetzt = selectJetzt(entries, new Set(), now, 3);
    expect(jetzt.lead?.id).toBe('essen');
    expect(jetzt.isRunning).toBe(false);
    expect(jetzt.minutes).toBe(18);
    expect(jetzt.later.map(({ id }) => id)).toEqual(['abend']);
  });

  it('has nothing on another day', () => {
    const jetzt = selectJetzt(entries, new Set(['q5']), new Date('2027-07-25T10:00:00Z'), 2);
    expect(jetzt.lead).toBeUndefined();
    expect(jetzt.later).toEqual([]);
  });
});
