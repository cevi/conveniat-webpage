import { isPushDeviceStale } from '@/lib/push/push-device-staleness';

const NOW = new Date('2026-11-05T12:00:00.000Z');

describe('isPushDeviceStale', () => {
  it('keeps a device that renewed within the last 30 days', () => {
    expect(isPushDeviceStale('2026-10-07T12:00:00.000Z', NOW)).toBe(false);
  });

  it('counts a device as gone after 30 days without renewal', () => {
    expect(isPushDeviceStale('2026-10-05T11:59:00.000Z', NOW)).toBe(true);
  });

  it('counts a device without a date as gone', () => {
    expect(isPushDeviceStale(null, NOW)).toBe(true);
    expect(isPushDeviceStale('not a date', NOW)).toBe(true);
  });
});
