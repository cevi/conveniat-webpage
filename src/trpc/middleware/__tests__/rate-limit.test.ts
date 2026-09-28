import type { Context } from '@/trpc/init';
import { createCallerFactory, createTRPCRouter, trpcBaseProcedure } from '@/trpc/init';

jest.mock('@/utils/auth', () => ({ auth: jest.fn() }));
jest.mock('@/lib/db/prisma', () => ({ __esModule: true, default: {} }));
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

/** A counter per key that expires one window after its first call, as the Lua script does. */
const counters = new Map<string, { count: number; expiresAt: number }>();
let redisDown = false;
jest.mock('@/lib/db/redis', () => ({
  redis: {
    eval: (_script: string, _keys: number, key: string, windowMs: number): Promise<number> => {
      if (redisDown) return Promise.reject(new Error('connect ECONNREFUSED'));
      const now = Date.now();
      const counter = counters.get(key);
      if (counter === undefined || counter.expiresAt <= now) {
        counters.set(key, { count: 1, expiresAt: now + windowMs });
        return Promise.resolve(1);
      }
      counter.count++;
      return Promise.resolve(counter.count);
    },
  },
}));

import { rateLimit } from '@/trpc/middleware/rate-limit';

const handled: string[] = [];

const createCaller = createCallerFactory(
  createTRPCRouter({
    shout: trpcBaseProcedure
      .use(
        rateLimit({
          name: 'test.shout',
          limit: 3,
          windowMs: 10_000,
          message: {
            de: 'Zu viele Rufe.',
            en: 'Too many shouts.',
            fr: 'Trop de cris.',
          },
        }),
      )
      .mutation(({ ctx }) => {
        handled.push(ctx.user.uuid);
        return 'ok';
      }),
  }),
);

const as = (uuid: string, locale = 'de'): ReturnType<typeof createCaller> =>
  createCaller({
    user: { uuid, group_ids: [], name: uuid, email: `${uuid}@example.test` },
    prisma: {},
    locale,
  } as unknown as Context);

/** The error code of a call, or `undefined` when it went through. */
const codeOf = async (call: Promise<unknown>): Promise<string | undefined> => {
  let code: string | undefined;
  await call.catch((error: unknown) => {
    code = (error as { code: string }).code;
  });
  return code;
};

beforeEach(() => {
  jest.useFakeTimers();
  counters.clear();
  handled.length = 0;
  redisDown = false;
});

afterEach(() => {
  jest.useRealTimers();
});

describe('rateLimit', () => {
  it('lets a burst up to the limit through at once', async () => {
    for (let call = 0; call < 3; call++) await as('anna').shout();

    expect(handled).toEqual(['anna', 'anna', 'anna']);
  });

  it('turns the next call away with TOO_MANY_REQUESTS, before the procedure runs', async () => {
    for (let call = 0; call < 3; call++) await as('anna').shout();

    await expect(as('anna').shout()).rejects.toMatchObject({
      code: 'TOO_MANY_REQUESTS',
      message: 'Zu viele Rufe.',
    });
    expect(handled).toHaveLength(3);
  });

  it('answers in the language of the user', async () => {
    for (let call = 0; call < 3; call++) await as('anna', 'fr').shout();

    await expect(as('anna', 'fr').shout()).rejects.toMatchObject({ message: 'Trop de cris.' });
  });

  it('counts every user on their own', async () => {
    for (let call = 0; call < 3; call++) await as('anna').shout();

    expect(await codeOf(as('ben').shout())).toBeUndefined();
  });

  it('lets the user through again once the window has passed, retries included', async () => {
    for (let call = 0; call < 5; call++) await codeOf(as('anna').shout());

    jest.advanceTimersByTime(10_000);

    expect(await codeOf(as('anna').shout())).toBeUndefined();
  });

  it('lets every call through while Redis is unreachable', async () => {
    redisDown = true;

    for (let call = 0; call < 5; call++) await as('anna').shout();

    expect(handled).toHaveLength(5);
  });
});
