/**
 * How long a push device may go without renewing its registration before it counts as gone.
 * Firebase calls a registration token stale after a month, and the native app renews its token
 * on every launch, so a month of silence means the app is no longer used on that phone.
 */
export const PUSH_DEVICE_STALE_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Whether a device last renewed its registration longer ago than {@link PUSH_DEVICE_STALE_MS}.
 * A device without a date counts as stale: nothing says it is still there.
 */
export const isPushDeviceStale = (
  lastUsedAt: string | null | undefined,
  now: Date = new Date(),
): boolean => {
  if (lastUsedAt === null || lastUsedAt === undefined) return true;
  const renewedAt = new Date(lastUsedAt).getTime();
  if (Number.isNaN(renewedAt)) return true;
  return now.getTime() - renewedAt > PUSH_DEVICE_STALE_MS;
};
