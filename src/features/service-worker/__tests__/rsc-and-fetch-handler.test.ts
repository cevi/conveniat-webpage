import { getCleanAppPath } from '@/features/service-worker/offline-support/rsc-utils';

describe('Service Worker Clean Path & RSC Utilities', () => {
  test('getCleanAppPath correctly strips locale and design prefixes', () => {
    expect(
      getCleanAppPath('/de/default/app/schedule/6952e094dadf4f28c0c5c7ee?date=2027-07-26'),
    ).toBe('/app/schedule/6952e094dadf4f28c0c5c7ee?date=2027-07-26');
    expect(getCleanAppPath('/en/web/app/emergency')).toBe('/app/emergency');
    expect(getCleanAppPath('/fr/app/helper-portal')).toBe('/app/helper-portal');
    expect(getCleanAppPath('/app/dashboard')).toBe('/app/dashboard');
  });
});
