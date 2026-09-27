import {
  daysUntil,
  getSubmissionProgress,
  isOpen,
  percentDone,
  type SubmissionProgressInput,
} from '@/features/hof-dashboard/utils/submission-progress';

/** Payload stores a day-only date as noon UTC of that day. */
const JANUARY_31 = '2027-01-31T12:00:00.000Z';

const input = (overrides: Partial<SubmissionProgressInput>): SubmissionProgressInput => ({
  mode: 'versions',
  deadline: JANUARY_31,
  statuses: [],
  ...overrides,
});

describe('daysUntil', () => {
  it('counts Zurich calendar days, 0 on the day of the deadline', () => {
    expect(daysUntil(JANUARY_31, new Date('2027-01-31T23:30:00.000Z'))).toBe(-1);
    expect(daysUntil(JANUARY_31, new Date('2027-01-30T23:30:00.000Z'))).toBe(0);
    expect(daysUntil(JANUARY_31, new Date('2027-01-17T09:00:00.000Z'))).toBe(14);
  });
});

describe('getSubmissionProgress', () => {
  const autumn = new Date('2026-10-01T10:00:00Z');

  it('is open while nothing is handed in and the deadline is far', () => {
    expect(getSubmissionProgress(input({}), autumn)).toMatchObject({
      state: 'open',
      gap: 'missing',
      status: undefined,
    });
  });

  it('is due soon within 14 days of the deadline, and overdue after it', () => {
    expect(getSubmissionProgress(input({}), new Date('2027-01-20T10:00:00Z'))).toMatchObject({
      state: 'dueSoon',
      daysLeft: 11,
    });
    expect(getSubmissionProgress(input({}), new Date('2027-02-10T10:00:00Z'))).toMatchObject({
      state: 'overdue',
      daysLeft: -10,
    });
  });

  it('is done once handed in, whatever the Ressort has not yet said', () => {
    for (const status of ['submitted', 'inReview', 'accepted'] as const) {
      expect(getSubmissionProgress(input({ statuses: [status] }), autumn)).toMatchObject({
        state: 'done',
        status,
      });
    }
  });

  it('counts only the newest version: a revision asked of an older one is done with', () => {
    expect(
      getSubmissionProgress(input({ statuses: ['revisionRequired', 'accepted'] }), autumn).gap,
    ).toBe('revision');
    expect(
      getSubmissionProgress(input({ statuses: ['submitted', 'revisionRequired'] }), autumn).state,
    ).toBe('done');
  });

  it('asks for a revision of any entry of a form of separate entries', () => {
    expect(
      getSubmissionProgress(
        input({ mode: 'entries', statuses: ['accepted', 'revisionRequired'] }),
        autumn,
      ).gap,
    ).toBe('revision');
  });

  it('stays open without a deadline', () => {
    expect(getSubmissionProgress(input({ deadline: undefined }), autumn).state).toBe('open');
  });

  it('is closed, not overdue, when its submissions closed with nothing handed in', () => {
    const progress = getSubmissionProgress(
      input({ closed: true }),
      new Date('2027-02-10T10:00:00Z'),
    );
    expect(progress).toMatchObject({ state: 'closed', gap: 'missing' });
    // nothing the Hof can do anymore, so the tabs do not count it
    expect(isOpen(progress)).toBe(false);
  });

  it('stays done when a handed-in form closes', () => {
    const progress = getSubmissionProgress(
      input({ closed: true, statuses: ['accepted'] }),
      new Date('2027-02-10T10:00:00Z'),
    );
    expect(progress.state).toBe('done');
    expect(isOpen(progress)).toBe(false);
  });

  it('still asks for what is missing while a form takes submissions', () => {
    expect(isOpen(getSubmissionProgress(input({}), new Date('2027-02-10T10:00:00Z')))).toBe(true);
  });
});

describe('percentDone', () => {
  it('rounds the share of done items and treats an empty list as nothing done', () => {
    expect(percentDone(['done', 'open', 'overdue'])).toBe(33);
    expect(percentDone([])).toBe(0);
  });
});
