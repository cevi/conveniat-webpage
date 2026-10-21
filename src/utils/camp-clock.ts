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
