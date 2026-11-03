import { PrismaClient } from '@/lib/prisma';
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
 * Builds a pool with the options `prisma.ts` hands to the adapter, and reads the transaction
 * limits it hands to the client.
 */
const loadChatDatabaseConfig = async (): Promise<{
  pool: Pool;
  max: number;
  maxWait: number;
  timeout: number;
}> => {
  await import('@/lib/db/prisma');
  const options = jest.mocked(PrismaPg).mock.calls[0]?.[0] as PoolConfig;
  const clientOptions = jest.mocked(PrismaClient).mock.calls[0]?.[0] as {
    transactionOptions: { maxWait: number; timeout: number };
  };
  const pool = new Pool({ ...options, Client: FakeClient as unknown as PoolConfig['Client'] });
  return { pool, max: options.max ?? 10, ...clientOptions.transactionOptions };
};

/** Lets the pool's callbacks and promise reactions run; `setImmediate` is not faked. */
const flush = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

describe('chat database pool', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('gives up waiting for a connection between the transaction maxWait and timeout', async () => {
    const { pool, max, maxWait, timeout } = await loadChatDatabaseConfig();
    const held = [];
    for (let index = 0; index < max; index++) held.push(await pool.connect());

    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
    let failure: Error | undefined;
    const acquire = pool.connect().then(
      (client) => client.release(),
      (error: unknown) => {
        failure = error as Error;
      },
    );

    jest.advanceTimersByTime(maxWait);
    await flush();
    expect(failure).toBeUndefined();

    jest.advanceTimersByTime(timeout - maxWait - 1);
    await flush();
    expect(failure?.message).toBe('timeout exceeded when trying to connect');

    jest.useRealTimers();
    for (const client of held) client.release();
    await acquire;
    await pool.end();
  });
});
