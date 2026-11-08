import { getJobSelectableDays } from '@/features/payload-cms/components/form/utils/job-period';

describe('getJobSelectableDays', () => {
  it('opens the days the editor picked, from noon UTC as the admin panel stores them', () => {
    const selectable = getJobSelectableDays({
      dateRange: { startDate: '2027-07-21T12:00:00.000Z', endDate: '2027-08-05T12:00:00.000Z' },
      minDays: 5,
    });
    expect(selectable).toEqual({
      firstDay: '2027-07-21',
      lastDay: '2027-08-05',
      minDays: 5,
      maxDays: undefined,
      maxRanges: 1,
    });
  });

  it('keeps a day picked at local midnight on that day', () => {
    const selectable = getJobSelectableDays({
      dateRange: { startDate: '2027-07-19T22:00:00.000Z', endDate: '2027-08-04T22:00:00.000Z' },
      minDays: 7,
    });
    expect(selectable?.firstDay).toBe('2027-07-20');
    expect(selectable?.lastDay).toBe('2027-08-05');
  });

  it('asks for no days when the job lasts its whole window', () => {
    const dateRange = {
      startDate: '2027-07-24T12:00:00.000Z',
      endDate: '2027-08-03T12:00:00.000Z',
    };
    expect(getJobSelectableDays({ dateRange })).toBeUndefined();
    expect(getJobSelectableDays({ dateRange, minDays: null })).toBeUndefined();
    expect(getJobSelectableDays({ dateRange, minDays: 0 })).toBeUndefined();
  });

  it('copes with a draft whose window is missing or shorter than the minimum', () => {
    expect(getJobSelectableDays({ minDays: 5 })).toBeUndefined();
    expect(
      getJobSelectableDays({
        dateRange: { startDate: '2027-07-24T12:00:00.000Z', endDate: '2027-07-26T12:00:00.000Z' },
        minDays: 5,
      }),
    ).toBeUndefined();
  });
});
