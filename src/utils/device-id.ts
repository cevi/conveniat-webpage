/* eslint-disable unicorn/prefer-global-this */
/**
 * Retrieves or generates a persistent device UUID for fingerprinting push notification subscriptions per device.
 */
export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return '';
  }

  const STORAGE_KEY = 'cevi_device_id';
  const existingId = localStorage.getItem(STORAGE_KEY);

  if (existingId !== null && existingId.trim() !== '') {
    return existingId;
  }

  const newDeviceId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

  try {
    localStorage.setItem(STORAGE_KEY, newDeviceId);
  } catch {
    // Ignore storage errors in restricted contexts
  }

  return newDeviceId;
}
