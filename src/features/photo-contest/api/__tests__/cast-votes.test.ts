import type { Context } from '@/trpc/init';
import { createCallerFactory } from '@/trpc/init';

jest.mock('@/utils/auth', () => ({ auth: jest.fn() }));
jest.mock('@payload-config', () => ({}), { virtual: true });
jest.mock('payload', () => ({ getPayload: jest.fn() }));
jest.mock('@/config/environment-variables', () => ({ environmentVariables: {} }));
jest.mock('@/utils/get-locale-from-cookies', () => ({
  getLocaleFromCookies: jest.fn().mockResolvedValue('de'),
}));
// Only the wire transformer; a direct caller never serializes anything.
jest.mock('superjson', () => ({
  __esModule: true,
  default: {
    serialize: (value: unknown): { json: unknown } => ({ json: value }),
    deserialize: (value: { json: unknown }): unknown => value.json,
  },
}));
jest.mock('@/lib/db/prisma', () => ({ __esModule: true, default: {} }));

import { photoContestRouter } from '@/features/photo-contest/api/photo-contest-router';

const CONTEST_ID = 'contest-scharniertag';
const IMAGES = ['image-cevi-uster', 'image-zueri-11', 'image-abteilung-st-gallen'];

let contest: { maxPointsPerUser: number; maxPointsPerImage: number };
let storedVotes: unknown[];

/** The photo contest tables, with just enough of Prisma's behaviour for `castVotes`. */
const prisma = {
  $transaction: <T>(callback: (tx: unknown) => Promise<T>): Promise<T> => callback(prisma),
  photoContest: {
    findUnique: (): Promise<unknown> =>
      Promise.resolve({
        id: CONTEST_ID,
        status: 'ACTIVE',
        votingStart: null,
        votingEnd: null,
        ...contest,
      }),
  },
  photoContestImage: {
    findMany: ({ where }: { where: { id: { in: string[] } } }): Promise<unknown> =>
      Promise.resolve(where.id.in.filter((id) => IMAGES.includes(id)).map((id) => ({ id }))),
  },
  photoContestVote: {
    deleteMany: (): Promise<unknown> => Promise.resolve({ count: 0 }),
    createMany: ({ data }: { data: unknown[] }): Promise<unknown> => {
      storedVotes = data;
      return Promise.resolve({ count: data.length });
    },
  },
};

const caller = createCallerFactory(photoContestRouter)({
  user: { uuid: 'anna', group_ids: [], name: 'Anna', email: 'anna@example.test' },
  prisma,
  locale: 'de',
} as unknown as Context);

const vote = (...points: [string, number][]): Promise<unknown> =>
  caller.castVotes({
    contestId: CONTEST_ID,
    allocations: points.map(([imageId, value]) => ({ imageId, points: value })),
  });

/** The error a call failed with, or `undefined` when it went through. */
const errorOf = async (call: Promise<unknown>): Promise<unknown> => {
  let failure: unknown;
  await call.catch((error: unknown) => {
    failure = error;
  });
  return failure;
};

beforeEach(() => {
  contest = { maxPointsPerUser: 2, maxPointsPerImage: 2 };
  storedVotes = [];
});

describe('castVotes', () => {
  it('accept more than 2 points on an image when the contest allows it', async () => {
    contest = { maxPointsPerUser: 5, maxPointsPerImage: 3 };

    await vote([IMAGES[0] as string, 3], [IMAGES[1] as string, 2]);

    expect(storedVotes).toHaveLength(2);
  });

  it("refuse more points on an image than the contest allows, with the contest's limit", async () => {
    contest = { maxPointsPerUser: 5, maxPointsPerImage: 3 };

    expect(await errorOf(vote([IMAGES[0] as string, 4]))).toMatchObject({
      code: 'BAD_REQUEST',
      reason: 'tooManyPointsPerImage',
      params: { max: 3 },
    });
    expect(storedVotes).toEqual([]);
  });

  it('count an image sent twice with both of its allocations', async () => {
    contest = { maxPointsPerUser: 2, maxPointsPerImage: 1 };

    expect(await errorOf(vote([IMAGES[0] as string, 1], [IMAGES[0] as string, 1]))).toMatchObject({
      reason: 'tooManyPointsPerImage',
      params: { max: 1 },
    });
    expect(storedVotes).toEqual([]);
  });

  it('store an image sent twice within the limit as one vote with both points', async () => {
    await vote([IMAGES[0] as string, 1], [IMAGES[0] as string, 1]);

    expect(storedVotes).toEqual([expect.objectContaining({ imageId: IMAGES[0], points: 2 })]);
  });

  it('refuse more points in total than the contest allows', async () => {
    expect(
      await errorOf(
        vote([IMAGES[0] as string, 1], [IMAGES[1] as string, 1], [IMAGES[2] as string, 1]),
      ),
    ).toMatchObject({ reason: 'tooManyPoints', params: { max: 2 } });
  });

  it('refuse an image of another contest with a reason', async () => {
    expect(await errorOf(vote(['image-elsewhere', 1]))).toMatchObject({
      reason: 'imageNotInContest',
    });
  });
});
