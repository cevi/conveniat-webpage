import {
  buildHelperAvailability,
  getHelperFormBlocks,
} from '@/features/payload-cms/payload-cms/utils/helper-availability';
import type { HelperJob } from '@/features/payload-cms/payload-types';

/** The shape of the Helferanmeldung: availability or a job per phase, each inside a condition. */
const sections = [
  {
    formSection: {
      fields: [
        {
          blockType: 'dateSlotSelection',
          name: 'zeitfenster',
          ressortName: 'ressortwunsch',
          startDate: '2027-07-11T22:00:00.000Z',
          endDate: '2027-07-19T22:00:00.000Z',
        },
      ],
    },
  },
  {
    formSection: {
      fields: [
        {
          blockType: 'conditionedBlock',
          fields: [{ blockType: 'jobSelection', name: 'jobhauptlager', dateRangeCategory: 'main' }],
        },
        {
          blockType: 'conditionedBlock',
          fields: [
            { blockType: 'jobSelection', name: 'jobabbaulager', dateRangeCategory: 'teardown' },
          ],
        },
      ],
    },
  },
];

const job = (overrides: Partial<HelperJob>): HelperJob =>
  ({
    id: 'job',
    title: 'Job',
    dateRangeCategory: 'main',
    category: 'verpflegung',
    dateRange: { startDate: '2027-07-24T10:00:00.000Z', endDate: '2027-07-26T10:00:00.000Z' },
    ...overrides,
  }) as HelperJob;

const kitchen = job({ id: 'kitchen', title: 'Küche' });
const teardown = job({
  id: 'teardown',
  title: 'Abbau Bühne',
  dateRangeCategory: 'teardown',
  dateRange: { startDate: '2027-08-03T10:00:00.000Z', endDate: '2027-08-10T10:00:00.000Z' },
  minDays: 2,
});
const power = job({
  id: 'power',
  title: 'Strom',
  category: 'infrastruktur',
  dateRange: { startDate: '2027-07-27T10:00:00.000Z', endDate: '2027-07-28T10:00:00.000Z' },
});
const jobsById = new Map([kitchen, teardown, power].map((entry) => [entry.id, entry]));

const build = (
  submissions: Parameters<typeof buildHelperAvailability>[0]['submissions'],
): ReturnType<typeof buildHelperAvailability> =>
  buildHelperAvailability({
    blocks: getHelperFormBlocks(sections),
    submissions,
    jobsById,
    personFields: ['vorname', 'ceviname'],
  });

describe('buildHelperAvailability', () => {
  it('marks every day of every range a helper gave, and shows the person answers asked for', () => {
    const { byAvailability, byJob } = build([
      {
        answers: [
          { field: 'vorname', value: 'Anna' },
          { field: 'ceviname', value: 'Pirat' },
          { field: 'zeitfenster', value: '2027-07-12 – 2027-07-13, 2027-07-17 – 2027-07-18' },
          { field: 'ressortwunsch', value: 'infrastruktur' },
        ],
        jobIds: [],
      },
    ]);

    expect(byJob).toEqual([]);
    expect(byAvailability).toEqual([
      {
        person: ['Anna', 'Pirat'],
        days: new Set(['2027-07-12', '2027-07-13', '2027-07-17', '2027-07-18']),
        ressort: 'Ressort Infrastruktur',
        jobTitles: [],
      },
    ]);
  });

  it('gives a job helper the whole job window, or the days they picked for a job with a minimum', () => {
    const { byAvailability, byJob } = build([
      {
        answers: [
          { field: 'vorname', value: 'Beat' },
          { field: 'jobhauptlager', value: 'Küche' },
          { field: 'jobabbaulager', value: 'Abbau Bühne' },
          { field: 'jobabbaulager_zeitraum', value: '2027-08-05 – 2027-08-06' },
        ],
        jobIds: ['kitchen', 'teardown'],
      },
    ]);

    expect(byAvailability).toEqual([]);
    expect(byJob).toEqual([
      {
        person: ['Beat', ''],
        days: new Set(['2027-07-24', '2027-07-25', '2027-07-26', '2027-08-05', '2027-08-06']),
        ressort: 'Ressort Verpflegung',
        jobTitles: ['Küche', 'Abbau Bühne'],
      },
    ]);
  });

  it('gives a job helper a row per Ressort, with the days of the jobs of that Ressort', () => {
    const { byJob } = build([
      { answers: [{ field: 'vorname', value: 'Carla' }], jobIds: ['kitchen', 'power'] },
    ]);

    expect(byJob.map(({ ressort, jobTitles, days }) => ({ ressort, jobTitles, days }))).toEqual([
      {
        ressort: 'Ressort Verpflegung',
        jobTitles: ['Küche'],
        days: new Set(['2027-07-24', '2027-07-25', '2027-07-26']),
      },
      {
        ressort: 'Ressort Infrastruktur',
        jobTitles: ['Strom'],
        days: new Set(['2027-07-27', '2027-07-28']),
      },
    ]);
  });

  it('leaves the Ressort empty when a helper by availability named none', () => {
    const { byAvailability } = build([
      { answers: [{ field: 'zeitfenster', value: '2027-07-12 – 2027-07-14' }], jobIds: [] },
    ]);

    expect(byAvailability[0]?.ressort).toBe('');
  });

  it('spans the columns over the whole form window and every helper day, without gaps', () => {
    const { days } = build([{ answers: [], jobIds: ['kitchen'] }]);

    expect(days[0]).toBe('2027-07-12');
    expect(days.at(-1)).toBe('2027-07-26');
    expect(days).toHaveLength(15);
  });

  it('skips a malformed availability instead of failing the export', () => {
    const { byAvailability } = build([
      { answers: [{ field: 'zeitfenster', value: 'nächste Woche' }], jobIds: [] },
    ]);

    expect(byAvailability).toEqual([]);
  });
});
