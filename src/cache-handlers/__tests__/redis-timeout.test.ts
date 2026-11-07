import type { AddressInfo, Server, Socket } from 'node:net';
import { createServer } from 'node:net';

/**
 * A Redis that accepts the connection and never answers, like one stalled by memory pressure or a
 * long command. The cache must give up on it instead of holding the render.
 */
describe('cache Redis client against a Redis that stopped answering', () => {
  let server: Server;
  const sockets: Socket[] = [];

  beforeAll(async () => {
    server = createServer((socket) => {
      sockets.push(socket);
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as AddressInfo;
    // eslint-disable-next-line n/no-process-env
    process.env['REDIS_URL'] = `redis://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    for (const socket of sockets) socket.destroy();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('rejects a read of the flush times instead of waiting forever', async () => {
    const { COMMAND_TIMEOUT_MS, createCacheRedisClient, readFlushedAt } =
      await import('@/cache-handlers/handlers/redis');
    const redis = createCacheRedisClient();
    const started = Date.now();
    try {
      await expect(readFlushedAt(redis, ['header'])).rejects.toThrow('Command timed out');
      expect(Date.now() - started).toBeLessThan(COMMAND_TIMEOUT_MS + 1000);
    } finally {
      redis.disconnect();
    }
  });

  it('serves a cache read as a miss', async () => {
    const { COMMAND_TIMEOUT_MS, RedisCache } = await import('@/cache-handlers/handlers/redis');
    const cache = new RedisCache();
    const started = Date.now();
    try {
      await expect(cache.get('page')).resolves.toBeUndefined();
      expect(Date.now() - started).toBeLessThan(COMMAND_TIMEOUT_MS + 1000);
    } finally {
      (cache as unknown as { redis: { disconnect: () => void } }).redis.disconnect();
    }
  });
});
