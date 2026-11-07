import { formatRegistrationNumber, reservePlaces } from '@/features/visit-day/api/visit-day-places';
import type { PrismaClient } from '@/lib/prisma/client';

const fakePrisma = (
  taken: number,
  lastCounter?: number,
): {
  prisma: PrismaClient;
  create: jest.Mock<Promise<unknown>, [unknown]>;
  aggregate: jest.Mock;
  count: jest.Mock;
} => {
  const create = jest.fn<Promise<unknown>, [unknown]>().mockResolvedValue({});
  // Prisma answers null for a Hof without registrations
  const aggregate = jest.fn().mockResolvedValue({ _max: { counter: lastCounter ?? null } });
  const count = jest.fn().mockResolvedValue(taken);
  const transaction = {
    $executeRaw: jest.fn().mockResolvedValue(1),
    visitDayVisitor: { count },
    visitDayRegistration: { aggregate, create },
  };
  const prisma = {
    $transaction: (work: (tx: typeof transaction) => Promise<unknown>): Promise<unknown> =>
      work(transaction),
  } as unknown as PrismaClient;
  return { prisma, create, aggregate, count };
};

const request = {
  submissionId: 'submission-1',
  hofId: 'hof-uster',
  hofEventId: '5321',
  date: '2027-07-28',
  persons: 2,
  withLunch: true,
  capacity: 500,
};

describe('reservePlaces', () => {
  it('gives the registration the next number of its Hof and one place per person', async () => {
    const { prisma, create } = fakePrisma(498, 6);

    await expect(reservePlaces(prisma, request)).resolves.toEqual({
      status: 'reserved',
      number: '5321-B007',
    });
    expect(create.mock.calls[0]?.[0]).toMatchObject({
      data: {
        number: '5321-B007',
        hofId: 'hof-uster',
        counter: 7,
        submissionId: 'submission-1',
        visitors: { create: [{ personNumber: 1 }, { personNumber: 2 }] },
      },
    });
  });

  it('starts a Hof at 001', async () => {
    const { prisma } = fakePrisma(0);

    await expect(reservePlaces(prisma, request)).resolves.toEqual({
      status: 'reserved',
      number: '5321-B001',
    });
  });

  it('counts the places without lunch apart and marks the registration', async () => {
    const { prisma, create, count } = fakePrisma(299);

    await expect(
      reservePlaces(prisma, { ...request, persons: 1, withLunch: false, capacity: 300 }),
    ).resolves.toMatchObject({ status: 'reserved' });
    expect(count).toHaveBeenCalledWith({
      where: {
        registration: { visitDate: new Date('2027-07-28T00:00:00.000Z'), withLunch: false },
      },
    });
    expect(create.mock.calls[0]?.[0]).toMatchObject({ data: { withLunch: false } });
  });

  it('numbers visitors without a Hof on a counter of their own', async () => {
    const { prisma, create, aggregate } = fakePrisma(0, 2);

    await expect(
      reservePlaces(prisma, { ...request, hofId: undefined, hofEventId: 'EXT' }),
    ).resolves.toEqual({ status: 'reserved', number: 'EXT-B003' });
    expect(aggregate).toHaveBeenCalledWith(expect.objectContaining({ where: { hofId: null } }));
    expect(create.mock.calls[0]?.[0]).toMatchObject({ data: { hofId: null, counter: 3 } });
  });

  it('counts visitors without a Hof against the Kontingent for them, across both kinds', async () => {
    const { prisma, create, count } = fakePrisma(0);
    // the places with lunch are free, the Kontingent has one place left
    count.mockResolvedValueOnce(0).mockResolvedValueOnce(49);
    const external = { ...request, hofId: undefined, hofEventId: 'EXT', externalCapacity: 50 };

    await expect(reservePlaces(prisma, external)).resolves.toEqual({ status: 'externalFull' });
    expect(count).toHaveBeenLastCalledWith({
      where: { registration: { visitDate: new Date('2027-07-28T00:00:00.000Z'), hofId: null } },
    });
    expect(create).not.toHaveBeenCalled();

    count.mockResolvedValueOnce(0).mockResolvedValueOnce(48);
    await expect(reservePlaces(prisma, external)).resolves.toMatchObject({ status: 'reserved' });
  });

  it('takes nobody without a Hof on a day closed to them, and leaves the Höfe alone', async () => {
    const { prisma, create } = fakePrisma(0);

    await expect(
      reservePlaces(prisma, {
        ...request,
        hofId: undefined,
        hofEventId: 'EXT',
        externalCapacity: -1,
      }),
    ).resolves.toEqual({ status: 'externalFull' });
    expect(create).not.toHaveBeenCalled();

    await expect(
      reservePlaces(prisma, { ...request, externalCapacity: -1 }),
    ).resolves.toMatchObject({ status: 'reserved' });
  });

  it('takes no place and no number when the persons do not all fit', async () => {
    const { prisma, create } = fakePrisma(499, 6);

    await expect(reservePlaces(prisma, request)).resolves.toEqual({ status: 'full' });
    expect(create).not.toHaveBeenCalled();
  });
});

describe('formatRegistrationNumber', () => {
  it('keeps counting past three digits', () => {
    expect(formatRegistrationNumber('5321', 1234)).toBe('5321-B1234');
  });
});
