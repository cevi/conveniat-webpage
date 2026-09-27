jest.mock('@/config/environment-variables', () => ({
  environmentVariables: {
    CEVIDB_GROUP_FULL_ADMIN: [541],
    CEVIDB_GROUP_WEB_CORE_TEAM: [105],
    GROUPS_WITH_API_ACCESS: [541, 105, 106],
  },
}));
jest.mock('payload', () => ({ countRunnableOrActiveJobsForQueue: jest.fn() }));
jest.mock('@/features/payload-cms/payload-cms/tasks/cleanup-stale-jobs', () => ({
  DEFAULT_QUEUE: 'default',
}));

import { FunktionenCollection } from '@/features/payload-cms/payload-cms/collections/funktionen-collection';
import type { PayloadRequest } from 'payload';
import { countRunnableOrActiveJobsForQueue } from 'payload';

const pending = jest.mocked(countRunnableOrActiveJobsForQueue);

/** A request to start the sync from the Funktionen list. */
const syncRequest = (
  groups: { id: number }[],
): { request: PayloadRequest; queue: jest.Mock; logger: { info: jest.Mock } } => {
  const queue = jest.fn().mockResolvedValue({});
  const logger = { info: jest.fn(), debug: jest.fn(), error: jest.fn() };
  const request = {
    user: { id: 'editor', groups },
    context: {},
    payload: { jobs: { queue }, logger },
  } as unknown as PayloadRequest;
  return { request, queue, logger };
};

const startSync = async (request: PayloadRequest): Promise<Response> => {
  const endpoint = (FunktionenCollection.endpoints || []).find(({ path }) => path === '/sync');
  if (endpoint === undefined) throw new Error('no sync endpoint');
  return await endpoint.handler(request);
};

describe('starting the camp functions sync from the admin panel', () => {
  beforeEach(() => jest.clearAllMocks());

  it('queues a run for the web team and logs who started it', async () => {
    pending.mockResolvedValue(0);
    const { request, queue, logger } = syncRequest([{ id: 105 }]);

    const response = await startSync(request);

    expect(response.status).toBe(202);
    expect(queue).toHaveBeenCalledWith(expect.objectContaining({ task: 'syncFunktionen' }));
    expect(logger.info).toHaveBeenCalledWith({ 'user.id': 'editor' }, expect.any(String));
  });

  it('does not queue a second run while one is queued or running', async () => {
    pending.mockResolvedValue(1);
    const { request, queue } = syncRequest([{ id: 105 }]);

    const response = await startSync(request);

    expect(response.status).toBe(200);
    expect(queue).not.toHaveBeenCalled();
  });

  it('refuses editors outside admin and web', async () => {
    const { request, queue } = syncRequest([{ id: 106 }]);

    const response = await startSync(request);

    expect(response.status).toBe(403);
    expect(queue).not.toHaveBeenCalled();
  });
});
