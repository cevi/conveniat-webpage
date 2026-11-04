/**
 * The part every weekly mail schedule in Bill Settings has in common.
 *
 * Both the weekly report and the Pflichtangaben reminder are hourly tasks that decide in
 * code whether this is their configured slot, so the decision lives in one place.
 */
export interface WeeklySlotConfig {
  enabled?: boolean | null;
  weekday?: string | null;
  hour?: number | null;
  lastSentAt?: string | null;
}

/**
 * The tasks run hourly; this decides whether *this* hour is the configured one.
 *
 * Payload's task schedule is a cron literal in code, so it cannot be moved by an operator.
 * The cron is therefore left coarse and the actual weekday and hour come from the
 * settings, which is what makes them editable in the admin.
 *
 * `lastSentAt` is the guard against sending twice: two replicas both reach this, and an
 * hourly cron will fire again inside the same configured hour if the first run was slow.
 * A send is refused if one already went out within six days.
 */
export function isWeeklySlotDue(
  config: WeeklySlotConfig | null | undefined,
  now: Date,
): { due: boolean; reason?: string | undefined } {
  if (config?.enabled !== true) return { due: false, reason: 'Sending is disabled.' };

  const weekday = Number.parseInt(config.weekday ?? '1', 10);
  const hour = typeof config.hour === 'number' ? Math.trunc(config.hour) : 7;

  if (Number.isFinite(weekday) && now.getDay() !== weekday)
    return { due: false, reason: 'Today is not the configured weekday.' };
  if (now.getHours() !== hour)
    return { due: false, reason: 'Current hour is not the configured hour.' };

  const lastSentAt = config.lastSentAt;
  if (typeof lastSentAt === 'string' && lastSentAt !== '') {
    const last = new Date(lastSentAt);
    if (!Number.isNaN(last.getTime())) {
      const daysSince = (now.getTime() - last.getTime()) / 86_400_000;
      // Six rather than seven: a report sent an hour late last week must not push this
      // week's out of its window.
      if (daysSince < 6) return { due: false, reason: 'Already sent this week.' };
    }
  }

  return { due: true };
}
