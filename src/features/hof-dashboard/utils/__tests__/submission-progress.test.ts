import {
  daysUntil,
  getSubmissionProgress,
  nextDeadline,
  percentDone,
  type SubmissionProgressInput,
} from '@/features/hof-dashboard/utils/submission-progress';

/** Payload stores a day-only date as noon UTC of that day. */
const JANUARY_31 = '2027-01-31T12:00:00.000Z';
const MARCH_31 = '2027-03-31T12:00:00.000Z';
const MAY_31 = '2027-05-31T12:00:00.000Z';

const input = (overrides: Partial<SubmissionProgressInput>): SubmissionProgressInput => ({
  hasPlan: false,
  hasSafetyConcept: false,
  elevatedSafetyRisk: undefined,
  status: undefined,
  deadlines: [JANUARY_31, MARCH_31, MAY_31],
  ...overrides,
});

describe('daysUntil', () => {
  it('counts Zurich calendar days, 0 on the day of the deadline', () => {
    expect(daysUntil(JANUARY_31, new Date('2027-01-31T23:30:00.000Z'))).toBe(-1);
    expect(daysUntil(JANUARY_31, new Date('2027-01-30T23:30:00.000Z'))).toBe(0);
    expect(daysUntil(JANUARY_31, new Date('2027-01-17T09:00:00.000Z'))).toBe(14);
  });
});

describe('nextDeadline', () => {
  it('works towards the next deadline still ahead, the day itself included', () => {
    expect(nextDeadline([MAY_31, JANUARY_31, MARCH_31], new Date('2027-01-31T10:00:00Z'))).toBe(
      JANUARY_31,
    );
    expect(nextDeadline([MAY_31, JANUARY_31, MARCH_31], new Date('2027-02-01T10:00:00Z'))).toBe(
      MARCH_31,
    );
  });

  it('keeps the last deadline once all have passed, so the submission reads as overdue', () => {
    expect(nextDeadline([JANUARY_31, MAY_31], new Date('2027-06-02T10:00:00Z'))).toBe(MAY_31);
  });

  it('has none without deadlines', () => {
    expect(nextDeadline([], new Date())).toBeUndefined();
  });
});

describe('getSubmissionProgress', () => {
  const autumn = new Date('2026-10-01T10:00:00Z');

  it('is open while the plan is missing and the deadline is far', () => {
    expect(getSubmissionProgress(input({}), autumn)).toMatchObject({
      state: 'open',
      gap: 'plan',
      deadline: JANUARY_31,
    });
  });

  it('is due soon within 14 days of the deadline', () => {
    expect(getSubmissionProgress(input({}), new Date('2027-01-20T10:00:00Z'))).toMatchObject({
      state: 'dueSoon',
      daysLeft: 11,
    });
  });

  it('is overdue from a missed deadline on, even with a later one ahead', () => {
    expect(getSubmissionProgress(input({}), new Date('2027-02-10T10:00:00Z'))).toMatchObject({
      state: 'overdue',
      deadline: JANUARY_31,
      daysLeft: -10,
    });
  });

  it('lets a requested revision work towards the next deadline', () => {
    expect(
      getSubmissionProgress(
        input({ hasPlan: true, elevatedSafetyRisk: 'no', status: 'revisionRequired' }),
        new Date('2027-02-10T10:00:00Z'),
      ),
    ).toMatchObject({ state: 'open', deadline: MARCH_31 });
  });

  it('stays overdue from the first missed deadline once all have passed', () => {
    expect(getSubmissionProgress(input({}), new Date('2027-06-10T10:00:00Z'))).toMatchObject({
      state: 'overdue',
      deadline: JANUARY_31,
    });
  });

  it('still asks for the safety question once the plan is up', () => {
    expect(getSubmissionProgress(input({ hasPlan: true }), autumn).gap).toBe('safetyRiskAnswer');
  });

  it('is done with a plan and no elevated risk', () => {
    expect(
      getSubmissionProgress(input({ hasPlan: true, elevatedSafetyRisk: 'no' }), autumn),
    ).toMatchObject({ state: 'done', gap: undefined });
  });

  it('wants a safety concept when the risk is elevated', () => {
    const withoutConcept = input({ hasPlan: true, elevatedSafetyRisk: 'yes' });
    expect(getSubmissionProgress(withoutConcept, autumn).gap).toBe('safetyConcept');
    expect(getSubmissionProgress({ ...withoutConcept, hasSafetyConcept: true }, autumn).state).toBe(
      'done',
    );
  });

  it('is open again when the Ressort asks for a revision', () => {
    expect(
      getSubmissionProgress(
        input({ hasPlan: true, elevatedSafetyRisk: 'no', status: 'revisionRequired' }),
        autumn,
      ).gap,
    ).toBe('revision');
  });
});

describe('percentDone', () => {
  it('rounds the share of done items and treats an empty list as nothing done', () => {
    expect(percentDone(['done', 'open', 'overdue'])).toBe(33);
    expect(percentDone([])).toBe(0);
  });
});
