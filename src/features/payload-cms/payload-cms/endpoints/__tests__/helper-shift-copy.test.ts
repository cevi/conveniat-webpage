jest.mock('@/config/environment-variables', () => ({
  environmentVariables: {
    CEVIDB_GROUP_FULL_ADMIN: [541],
    CEVIDB_GROUP_WEB_CORE_TEAM: [105],
    CEVIDB_GROUP_HELPER_POOL: [112],
  },
}));

import { helperShiftCopyHandler } from '@/features/payload-cms/payload-cms/endpoints/helper-shift-copy';
import type { PayloadRequest } from 'payload';

const HELPER_POOL = 112;
const PARTICIPANT = 4242;

/** The shift being copied: Monday 26 July in Zurich, stored the way the date picker does. */
const SOURCE = {
  id: 's1',
  title: 'Abwasch Grossküche',
  timeslot: { date: '2027-07-26T10:00:00.000Z', time: '07:00 - 10:00' },
};

const createRequest = (
  groupId: number,
  body: unknown,
  existing: (typeof SOURCE)[] = [SOURCE],
): { request: PayloadRequest; duplicate: jest.Mock } => {
  const duplicate = jest.fn().mockResolvedValue({});
  return {
    duplicate,
    request: {
      routeParams: { id: SOURCE.id },
      user: { id: 'u1', groups: [{ id: groupId }] },
      json: (): Promise<unknown> => Promise.resolve(body),
      payload: {
        findByID: jest.fn().mockResolvedValue(SOURCE),
        find: jest.fn().mockResolvedValue({ docs: existing }),
        duplicate,
        logger: { info: jest.fn() },
      },
    } as unknown as PayloadRequest,
  };
};

const copiedSlots = (duplicate: jest.Mock): unknown[] =>
  duplicate.mock.calls.map(([options]: [{ data: unknown }]) => options.data);

describe('copying a Schichteinsatz to more days', () => {
  it('refuses whoever does not plan the Schichteinsätze', async () => {
    const { request, duplicate } = createRequest(PARTICIPANT, {
      days: ['2027-07-27'],
      times: ['07:00 - 10:00'],
    });

    const response = await helperShiftCopyHandler(request);

    expect(response.status).toBe(401);
    expect(duplicate).not.toHaveBeenCalled();
  });

  it('creates one shift per day and time slot, on the same Zurich day and time of day', async () => {
    const { request, duplicate } = createRequest(HELPER_POOL, {
      days: ['2027-07-27', '2027-07-28'],
      times: ['07:00 - 10:00', '18:30 - 21:00'],
    });

    const response = await helperShiftCopyHandler(request);

    expect(await response.json()).toEqual({ created: 4, skipped: 0 });
    expect(copiedSlots(duplicate)).toEqual([
      { timeslot: { date: '2027-07-27T10:00:00.000Z', time: '07:00 - 10:00' } },
      { timeslot: { date: '2027-07-27T10:00:00.000Z', time: '18:30 - 21:00' } },
      { timeslot: { date: '2027-07-28T10:00:00.000Z', time: '07:00 - 10:00' } },
      { timeslot: { date: '2027-07-28T10:00:00.000Z', time: '18:30 - 21:00' } },
    ]);
  });

  it('skips a slot that already has a shift of the same title, so a second run adds nothing', async () => {
    const { request, duplicate } = createRequest(HELPER_POOL, {
      days: ['2027-07-26', '2027-07-27'],
      times: ['07:00 - 10:00'],
    });

    const response = await helperShiftCopyHandler(request);

    expect(await response.json()).toEqual({ created: 1, skipped: 1 });
    expect(copiedSlots(duplicate)).toEqual([
      { timeslot: { date: '2027-07-27T10:00:00.000Z', time: '07:00 - 10:00' } },
    ]);
  });

  it('rejects a time slot that is not HH:mm - HH:mm', async () => {
    const { request, duplicate } = createRequest(HELPER_POOL, {
      days: ['2027-07-27'],
      times: ['7 bis 10'],
    });

    const response = await helperShiftCopyHandler(request);

    expect(response.status).toBe(400);
    expect(duplicate).not.toHaveBeenCalled();
  });
});
