import { buildStoryBoard, PROLOGUE_COLUMN } from '@/features/story/payload-cms/story-board-data';

const emptyBoard = (programmeDates?: {
  first: string | null | undefined;
  last: string | null | undefined;
}): string[] =>
  buildStoryBoard({
    events: [],
    figures: [],
    challenges: [],
    blocks: [],
    ...(programmeDates === undefined ? {} : { programmeDates }),
    asOf: new Date('2027-07-20T12:00:00.000Z'),
  }).map((column) => column.key);

describe('the Story-Board before the story team wrote anything', () => {
  it('has a column for the backstory and for every day of the programme', () => {
    expect(
      emptyBoard({ first: '2027-07-24T12:00:00.000Z', last: '2027-07-27T12:00:00.000Z' }),
    ).toEqual([PROLOGUE_COLUMN, '2027-07-24', '2027-07-25', '2027-07-26', '2027-07-27']);
  });

  it('has only the backstory while there is no programme', () => {
    expect(emptyBoard()).toEqual([PROLOGUE_COLUMN]);
    expect(emptyBoard({ first: undefined, last: undefined })).toEqual([PROLOGUE_COLUMN]);
  });

  it('opens no more than a month of days for a stray date', () => {
    expect(
      emptyBoard({ first: '2027-07-24T12:00:00.000Z', last: '2029-01-01T12:00:00.000Z' }),
    ).toHaveLength(1 + 31);
  });
});
