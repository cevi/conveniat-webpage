import { PrismaPg } from '@prisma/adapter-pg';
import { EventEmitter } from 'node:events';
import type { PoolConfig } from 'pg';
import { Pool } from 'pg';

jest.mock('@/config/environment-variables', () => ({
  environmentVariables: {
    CHAT_DATABASE_URL: 'postgres://test',
    NODE_ENV: 'test',
  },
}));
jest.mock('@/lib/prisma', () => ({ PrismaClient: jest.fn() }));
jest.mock('@prisma/adapter-pg', () => ({ PrismaPg: jest.fn() }));

/** Prisma's default `maxWait` and `timeout` of an interactive transaction. */
const TRANSACTION_MAX_WAIT_MS = 2000;
const TRANSACTION_TIMEOUT_MS = 5000;

/** A client that connects without a server, so the pool can be filled in a test. */
// pg-pool listens with `on`/`once`, like on pg's own Client, which is an EventEmitter.
// eslint-disable-next-line unicorn/prefer-event-target
class FakeClient extends EventEmitter {
  connect(callback: (error?: Error) => void): void {
    setImmediate(() => callback());
  }

  end(): void {
    this.emit('end');
  }

  isConnected(): boolean {
    return true;
  }
}

/**
 * Builds a pool with the options `prisma.ts` hands to the adapter.
 */
const createPoolWithChatOptions = async (): Promise<{ pool: Pool; max: number }> => {
  await import('@/lib/db/prisma');
  const options = jest.mocked(PrismaPg).mock.calls[0]?.[0] as PoolConfig;
  const pool = new Pool({ ...options, Client: FakeClient as unknown as PoolConfig['Client'] });
  return { pool, max: options.max ?? 10 };
};

describe('chat database pool', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('gives up waiting for a connection between Prisma maxWait and its transaction timeout', async () => {
    const { pool, max } = await createPoolWithChatOptions();
    for (let index = 0; index < max; index++) await pool.connect();

    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
    let settled = false;
    const acquire = pool.connect().finally(() => {
      settled = true;
    });
    acquire.catch(() => {});

    jest.advanceTimersByTime(TRANSACTION_MAX_WAIT_MS);
    await Promise.resolve();
    expect(settled).toBe(false);

    jest.advanceTimersByTime(TRANSACTION_TIMEOUT_MS - TRANSACTION_MAX_WAIT_MS - 1);
    await expect(acquire).rejects.toThrow('timeout exceeded when trying to connect');
  });
});
