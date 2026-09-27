jest.mock('payload', () => ({ countRunnableOrActiveJobsForQueue: jest.fn() }));
jest.mock('@/features/payload-cms/payload-cms/tasks/cleanup-stale-jobs', () => ({
  DEFAULT_QUEUE: 'default',
  cleanupCompletedScheduledJobs: jest.fn(),
  cleanupStaleScheduledJobs: jest.fn(),
}));
jest.mock('@/config/environment-variables', () => ({
  environmentVariables: { CEVIDB_FUNCTIONS_ROOT_GROUP_ID: '4046' },
}));
jest.mock('@/lib/hitobito', () => ({
  ...jest.requireActual<object>('@/lib/hitobito/client'),
  getHitobito: jest.fn().mockResolvedValue({ groups: {} }),
}));
jest.mock('@/features/payload-cms/payload-cms/utils/sync-funktionen', () => ({
  ...jest.requireActual<object>('@/features/payload-cms/payload-cms/utils/sync-funktionen'),
  syncFunktionen: jest.fn(),
}));
jest.mock('@/utils/tracing-helpers', () => ({
  withSpan: (_name: string, callback: (span: unknown) => Promise<unknown>): Promise<unknown> =>
    callback({ setAttributes: jest.fn() }),
}));

import { syncFunktionenTask } from '@/features/payload-cms/payload-cms/tasks/sync-funktionen';
import { syncFunktionen } from '@/features/payload-cms/payload-cms/utils/sync-funktionen';
import { SessionExpiredError } from '@/lib/hitobito/errors';
import type { PayloadRequest } from 'payload';

const sync = jest.mocked(syncFunktionen);
const logger = { debug: jest.fn(), info: jest.fn(), error: jest.fn() };
const request = { payload: { logger } } as unknown as PayloadRequest;

const run = async (): Promise<unknown> => {
  const handler = syncFunktionenTask.handler as (args: { req: PayloadRequest }) => Promise<unknown>;
  return await handler({ req: request });
};

describe('the camp functions sync job', () => {
  beforeEach(() => jest.clearAllMocks());

  it('logs what every run changed', async () => {
    sync.mockResolvedValue({ groups: 4, created: 1, updated: 0, removed: 0, usersWritten: 2 });

    await run();

    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ 'funktionen.created': 1, 'funktionen.users_written': 2 }),
      'Synced the camp functions from Cevi.DB',
    );
  });

  it('logs a failed run as an error, naming an expired session as such, and still fails', async () => {
    sync.mockRejectedValue(new SessionExpiredError('https://db.cevi.ch/groups/4046/people.json'));

    await expect(run()).rejects.toBeInstanceOf(SessionExpiredError);
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        'funktionen.failure': 'session_expired',
        'funktionen.root_group': '4046',
      }),
      expect.stringContaining('failed'),
    );
  });
});
