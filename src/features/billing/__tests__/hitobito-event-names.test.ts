import { HitobitoServiceAdapter } from '@/features/billing/adapters/hitobito-service.adapter';
import type { HitobitoClient } from '@/features/registration_process/hitobito-api/client';

const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };

/** A Cevi.DB client whose JSON:API call answers with the given event list. */
const clientReturning = (data: unknown): HitobitoClient =>
  ({ apiRequest: jest.fn().mockResolvedValue({ data }) }) as unknown as HitobitoClient;

describe('HitobitoServiceAdapter.fetchEventsForGroup', () => {
  it('decodes the entities Cevi.DB wraps an event name in', async () => {
    const adapter = new HitobitoServiceAdapter(
      clientReturning([
        {
          id: 'e-1',
          attributes: { name: 'Hauptlager conveniat27 - Altstetten &amp;amp; Albisrieden' },
        },
        { id: 'e-2', attributes: { name: 'Hauptlager conveniat27 - Hof Süd' } },
        { id: 'e-3', attributes: {} },
      ]),
      logger,
    );

    await expect(adapter.fetchEventsForGroup('4337')).resolves.toEqual([
      { id: 'e-1', name: 'Hauptlager conveniat27 - Altstetten & Albisrieden' },
      { id: 'e-2', name: 'Hauptlager conveniat27 - Hof Süd' },
      { id: 'e-3', name: '' },
    ]);
  });
});
