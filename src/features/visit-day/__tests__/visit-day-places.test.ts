import { reservePlaces } from '@/features/visit-day/api/visit-day-places';
import type { PrismaClient } from '@/lib/prisma';

const fakePrisma = (taken: number): { prisma: PrismaClient; createMany: jest.Mock } => {
  const createMany = jest.fn().mockResolvedValue({ count: 0 });
  const transaction = {
    $executeRaw: jest.fn().mockResolvedValue(1),
    visitDayVisitor: { count: jest.fn().mockResolvedValue(taken), createMany },
  };
  const prisma = {
    $transaction: (work: (tx: typeof transaction) => Promise<unknown>) => work(transaction),
  } as unknown as PrismaClient;
  return { prisma, createMany };
};

const request = {
  submissionId: 'submission-1',
  hofId: 'hof-uster',
  date: '2027-07-28',
  persons: 2,
  capacity: 500,
};

describe('reservePlaces', () => {
  it('takes one place per person while the day has room', async () => {
    const { prisma, createMany } = fakePrisma(498);

    await expect(reservePlaces(prisma, request)).resolves.toBe('reserved');
    expect(createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({ submissionId: 'submission-1', personNumber: 1 }),
        expect.objectContaining({ submissionId: 'submission-1', personNumber: 2 }),
      ],
    });
  });

  it('takes no place at all when the persons do not all fit', async () => {
    const { prisma, createMany } = fakePrisma(499);

    await expect(reservePlaces(prisma, request)).resolves.toBe('full');
    expect(createMany).not.toHaveBeenCalled();
  });
});
