const campClockFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Zurich',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/**
 * The day and the time of day on the camp's clock, Europe/Zurich, whatever timezone the phone
 * is set to: "today" and "now" in the programme are the camp's, not the traveller's.
 */
export const campClockOf = (now: Date): { dayKey: string; minutes: number } => {
  const parts = campClockFormat.formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((candidate) => candidate.type === type)?.value ?? '00';
  return {
    dayKey: `${part('year')}-${part('month')}-${part('day')}`,
    minutes: Number(part('hour')) * 60 + Number(part('minute')),
  };
};

/** How far the camp's clock is ahead of UTC at `instant`, in minutes: 120 in summer, 60 in winter. */
const campOffsetMinutesAt = (instant: Date): number => {
  const { dayKey, minutes } = campClockOf(instant);
  const [year = 0, month = 1, day = 1] = dayKey.split('-').map(Number);
  const wallClockAsUtc = Date.UTC(year, month - 1, day) + minutes * 60_000;
  const instantToTheMinute = Math.floor(instant.getTime() / 60_000) * 60_000;
  return Math.round((wallClockAsUtc - instantToTheMinute) / 60_000);
};

/**
 * The moment the camp's clock shows `minutes` past midnight on `dayKey` (`YYYY-MM-DD`): the
 * inverse of {@link campClockOf}. Minutes past 1440 run into the next day, as a block ending
 * after midnight does. A wall-clock time the switch to summer time skips comes out an hour
 * later, and one the switch back shows twice is its second occurrence.
 */
export const campInstantOf = (dayKey: string, minutes: number): Date | undefined => {
  const [year, month, day] = dayKey.split('-').map(Number);
  if (year === undefined || month === undefined || day === undefined) return undefined;
  const wallClockAsUtc = Date.UTC(year, month - 1, day) + minutes * 60_000;
  if (Number.isNaN(wallClockAsUtc)) return undefined;

  // the offset at the guess, then at the answer, in case the guess fell across a switch
  const guess = wallClockAsUtc - campOffsetMinutesAt(new Date(wallClockAsUtc)) * 60_000;
  return new Date(wallClockAsUtc - campOffsetMinutesAt(new Date(guess)) * 60_000);
};
