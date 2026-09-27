import { PayloadSettingsAdapter } from '@/features/billing/adapters/payload-settings.adapter';
import type { Payload } from 'payload';

const EVENTS = [{ eventId: '4711', eventName: 'conveniat27 Hof Süd' }];

/** A Payload that knows the given Höfe by Cevi.DB group. */
const payloadWith = (
  hoefe: { id: string; groupId: string }[],
): Pick<Payload, 'find' | 'create' | 'update'> & Record<string, jest.Mock> =>
  ({
    find: jest.fn(({ where }: { where: { groupId: { equals: string } } }) =>
      Promise.resolve({ docs: hoefe.filter((hof) => hof.groupId === where.groupId.equals) }),
    ),
    create: jest.fn(() => Promise.resolve({})),
    update: jest.fn(() => Promise.resolve({})),
  }) as unknown as Pick<Payload, 'find' | 'create' | 'update'> & Record<string, jest.Mock>;

describe('PayloadSettingsAdapter.upsertHoefe', () => {
  it('renames a known Hof to its name in Cevi.DB on every sync', async () => {
    const payload = payloadWith([{ id: 'hof-sued', groupId: '990002' }]);
    await new PayloadSettingsAdapter(payload as unknown as Payload).upsertHoefe([
      { groupId: '990002', name: 'Hof Süd (neu)', events: EVENTS },
    ]);
    expect(payload.create).not.toHaveBeenCalled();
    expect(payload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'hoefe',
        id: 'hof-sued',
        data: { name: 'Hof Süd (neu)', events: EVENTS },
      }),
    );
  });

  it('creates a Hof it finds for the first time, with its group, name and addresses', async () => {
    const payload = payloadWith([]);
    await new PayloadSettingsAdapter(payload as unknown as Payload).upsertHoefe([
      {
        groupId: '990005',
        name: 'Hof Neu',
        events: EVENTS,
        addressManagerEmails: 'av@hof-neu.ch',
      },
    ]);
    expect(payload.create).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'hoefe',
        data: {
          groupId: '990005',
          name: 'Hof Neu',
          events: EVENTS,
          addressManagerEmails: 'av@hof-neu.ch',
        },
      }),
    );
  });
});
