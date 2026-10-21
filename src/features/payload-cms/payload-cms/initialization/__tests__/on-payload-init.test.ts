import { environmentVariables } from '@/config/environment-variables';
import { onPayloadInit } from '@/features/payload-cms/payload-cms/initialization';
import { seedDatabase } from '@/features/payload-cms/payload-cms/initialization/seeding';
import { execSync } from 'node:child_process';
import fs from 'node:fs/promises';
import type { Payload } from 'payload';

jest.mock('@/config/environment-variables', () => ({
  environmentVariables: { NODE_ENV: 'production' },
}));
jest.mock('@/features/payload-cms/payload-cms/initialization/deleting', () => ({}));
jest.mock('@/features/payload-cms/payload-cms/initialization/ensure-indexes', () => ({
  ensureIndexes: jest.fn().mockResolvedValue(void 0),
}));
jest.mock('@/features/payload-cms/payload-cms/initialization/migrate-form-files', () => ({}));
jest.mock(
  '@/features/payload-cms/payload-cms/initialization/migrate-form-placeholders',
  () => ({}),
);
jest.mock('@/features/payload-cms/payload-cms/initialization/migrate-legacy-hoefe', () => ({}));
jest.mock('@/features/payload-cms/payload-cms/initialization/seeding', () => ({
  seedDatabase: jest.fn().mockResolvedValue(void 0),
}));
jest.mock('@/features/payload-cms/payload-cms/tasks/active-job-tracking', () => ({
  announceRunningJobsWith: jest.fn(),
  getRunningJobIds: (): string[] => [],
}));
jest.mock('@/features/payload-cms/payload-cms/utils/hof-membership', () => ({}));
const queryRaw = jest.fn();
jest.mock('@/lib/db/prisma', () => ({
  __esModule: true,
  default: { $queryRaw: (...arguments_: unknown[]): unknown => queryRaw(...arguments_) },
}));
jest.mock('@/lib/s3', () => ({}));
jest.mock('@/utils/tracing-helpers', () => ({
  withSpan: (_name: string, run: () => Promise<unknown>): Promise<unknown> => run(),
}));
jest.mock('node:child_process', () => ({ execSync: jest.fn() }));
jest.mock('node:fs/promises', () => ({
  __esModule: true,
  default: {
    open: jest.fn().mockResolvedValue({ write: jest.fn(), close: jest.fn() }),
    rm: jest.fn().mockResolvedValue(void 0),
    writeFile: jest.fn().mockResolvedValue(void 0),
    readFile: jest.fn(),
  },
}));

const mockedEnvironment = environmentVariables as { NODE_ENV: string };

const payloadWith = (count: jest.Mock): Payload =>
  ({
    count,
    find: jest.fn().mockResolvedValue({ docs: [] }),
    create: jest.fn().mockResolvedValue({ id: 'worker' }),
    update: jest.fn().mockResolvedValue({ id: 'worker' }),
    delete: jest.fn().mockResolvedValue({}),
    config: { jobs: { autoRun: [] } },
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  }) as unknown as Payload;

const initializationCompleted = (): boolean =>
  (globalThis as { __payloadInitCompleted__?: boolean }).__payloadInitCompleted__ === true;

describe('onPayloadInit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (globalThis as { __payloadInitCompleted__?: boolean }).__payloadInitCompleted__ = false;
    mockedEnvironment.NODE_ENV = 'production';
  });

  it('leaves the databases alone when it cannot tell whether they are seeded', async () => {
    queryRaw.mockRejectedValue(new Error('relation "User" does not exist'));

    await onPayloadInit(payloadWith(jest.fn().mockRejectedValue(new Error('mongo unreachable'))));

    expect(execSync).not.toHaveBeenCalled();
    expect(seedDatabase).not.toHaveBeenCalled();
    expect(fs.rm).not.toHaveBeenCalled();
    // so the next initialization asks again
    expect(initializationCompleted()).toBe(false);
  });

  it('does not push the Prisma schema outside development, even with the tables missing', async () => {
    queryRaw.mockRejectedValue(new Error('relation "User" does not exist'));

    await onPayloadInit(payloadWith(jest.fn().mockResolvedValue({ totalDocs: 0 })));

    expect(execSync).not.toHaveBeenCalled();
    expect(initializationCompleted()).toBe(true);
  });

  it('creates the missing Prisma tables in development from the migrations', async () => {
    mockedEnvironment.NODE_ENV = 'development';
    queryRaw.mockRejectedValue(new Error('relation "User" does not exist'));

    await onPayloadInit(payloadWith(jest.fn().mockResolvedValue({ totalDocs: 0 })));

    expect(execSync).toHaveBeenCalledWith('npx prisma migrate deploy', { stdio: 'inherit' });
    expect(seedDatabase).toHaveBeenCalled();
  });
});
