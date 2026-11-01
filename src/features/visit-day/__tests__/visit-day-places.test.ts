import { formatRegistrationNumber, reservePlaces } from '@/features/visit-day/api/visit-day-places';
import type { PrismaClient } from '@/lib/prisma';

const fakePrisma = (
  taken: number,
  lastCounter?: number,
): { prisma: PrismaClient; create: jest.Mock<Promise<unknown>, [unknown]> } => {
  const create = jest.fn<Promise<unknown>, [unknown]>().mockResolvedValue({});
  const transaction = {
    $executeRaw: jest.fn().mockResolvedValue(1),
    visitDayVisitor: { count: jest.fn().mockResolvedValue(taken) },
    visitDayRegistration: {
      // Prisma answers null for a Hof without registrations
      // eslint-disable-next-line unicorn/no-null
      aggregate: jest.fn().mockResolvedValue({ _max: { counter: lastCounter ?? null } }),
      create,
    },
  };
  const prisma = {
    $transaction: (work: (tx: typeof transaction) => Promise<unknown>): Promise<unknown> =>
      work(transaction),
  } as unknown as PrismaClient;
  return { prisma, create };
};

const request = {
  submissionId: 'submission-1',
  hofId: 'hof-uster',
  hofEventId: '5321',
  date: '2027-07-28',
  persons: 2,
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
