const countMaterialLoans = jest.fn<Promise<number>, [{ where: { hofId: string } }]>();
jest.mock('@/lib/db/prisma', () => ({
  __esModule: true,
  default: {
    materialLoan: {
      count: (args: { where: { hofId: string } }): Promise<number> => countMaterialLoans(args),
    },
  },
}));

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

describe('PayloadSettingsAdapter.deleteUnreferencedHoefe', () => {
  const WAENGI = { id: 'hof-waengi', groupId: '990010', name: 'Wängi', events: EVENTS };

  /** A Payload holding the Hof, counting `referencing` documents in the named collections. */
  const payloadCounting = (
    referencing: Partial<Record<'users' | 'form-submissions' | 'bill-participants', number>>,
  ): Pick<Payload, 'find' | 'count' | 'delete'> & Record<string, jest.Mock> =>
    ({
      find: jest.fn(() => Promise.resolve({ docs: [WAENGI] })),
      count: jest.fn(({ collection }: { collection: keyof typeof referencing }) =>
        Promise.resolve({ totalDocs: referencing[collection] ?? 0 }),
      ),
      delete: jest.fn(() => Promise.resolve({})),
    }) as unknown as Pick<Payload, 'find' | 'count' | 'delete'> & Record<string, jest.Mock>;

  beforeEach(() => {
    countMaterialLoans.mockReset().mockResolvedValue(0);
  });

  it('deletes a Hof nothing points at', async () => {
    const payload = payloadCounting({});
    const removals = await new PayloadSettingsAdapter(
      payload as unknown as Payload,
    ).deleteUnreferencedHoefe(['990010']);

    expect(payload.delete).toHaveBeenCalledWith(
      expect.objectContaining({ collection: 'hoefe', id: 'hof-waengi' }),
    );
    expect(removals).toEqual([{ groupId: '990010', name: 'Wängi', deleted: true, references: [] }]);
  });

  it('keeps a Hof a submission, a participant or a loan still points at, and says which', async () => {
    const payload = payloadCounting({ 'form-submissions': 2, 'bill-participants': 1 });
    countMaterialLoans.mockResolvedValue(3);
    const removals = await new PayloadSettingsAdapter(
      payload as unknown as Payload,
    ).deleteUnreferencedHoefe(['990010']);

    expect(payload.delete).not.toHaveBeenCalled();
    expect(countMaterialLoans).toHaveBeenCalledWith({ where: { hofId: 'hof-waengi' } });
    expect(removals).toEqual([
      {
        groupId: '990010',
        name: 'Wängi',
        deleted: false,
        references: ['2 form submissions', '1 billing participants', '3 material loans'],
      },
    ]);
  });

  it('looks nothing up when no group is gone', async () => {
    const payload = payloadCounting({});
    await new PayloadSettingsAdapter(payload as unknown as Payload).deleteUnreferencedHoefe([]);
    expect(payload.find).not.toHaveBeenCalled();
  });
});
