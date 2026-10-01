jest.mock('@/config/environment-variables', () => ({
  environmentVariables: {
    CEVIDB_GROUP_FULL_ADMIN: [541],
    CEVIDB_GROUP_WEB_CORE_TEAM: [105],
    CEVIDB_GROUP_HOF_DASHBOARD_REVIEWERS: [],
    CEVIDB_FUNCTIONS_ROOT_GROUP_ID: '4046',
  },
}));
jest.mock('@/lib/hitobito', () => ({
  getHitobito: jest.fn().mockResolvedValue({ groups: {} }),
}));
jest.mock('@/features/payload-cms/payload-cms/utils/sync-funktionen', () => ({
  ...jest.requireActual<object>('@/features/payload-cms/payload-cms/utils/sync-funktionen'),
  syncFunktionen: jest.fn(),
}));

import { FunktionenCollection } from '@/features/payload-cms/payload-cms/collections/funktionen-collection';
import {
  syncFunktionen,
  type FunktionenSyncStreamMessage,
} from '@/features/payload-cms/payload-cms/utils/sync-funktionen';
import { SessionExpiredError } from '@/lib/hitobito/errors';
import type { PayloadRequest } from 'payload';

const sync = jest.mocked(syncFunktionen);

const syncRequest = (
  groups: { id: number }[],
): { request: PayloadRequest; logger: Record<string, jest.Mock> } => {
  const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
  const request = {
    user: { id: 'editor', groups },
    context: {},
    payload: { logger },
  } as unknown as PayloadRequest;
  return { request, logger };
};

const startSync = async (request: PayloadRequest): Promise<Response> => {
  const endpoint = (FunktionenCollection.endpoints || []).find(({ path }) => path === '/sync');
  if (endpoint === undefined) throw new Error('no sync endpoint');
  return await endpoint.handler(request);
};

/** Every frame the stream wrote, in order. */
const framesOf = async (response: Response): Promise<FunktionenSyncStreamMessage[]> => {
  const body = await response.text();
  return body
    .split('\n')
    .filter((line) => line !== '')
    .map((line) => JSON.parse(line) as FunktionenSyncStreamMessage);
};

describe('syncing the camp functions from the admin panel', () => {
  beforeEach(() => jest.clearAllMocks());

  it('streams the progress and the outcome of the sync, and logs who started it', async () => {
    sync.mockImplementation((_payload, _source, _root, onProgress) => {
      onProgress?.({ phase: 'discovering', discoveredGroups: 3 });
      onProgress?.({
        phase: 'reading',
        processedGroups: 1,
        totalGroups: 3,
        found: [{ groupId: '4087', groupName: 'Ressort Infrastruktur', leaders: 2 }],
      });
      return Promise.resolve({ groups: 3, created: 1, updated: 0, removed: 0, usersWritten: 2 });
    });
    const { request, logger } = syncRequest([{ id: 105 }]);

    const frames = await framesOf(await startSync(request));

    expect(frames.map((frame) => frame.type)).toEqual(['progress', 'progress', 'done']);
    expect(frames.at(-1)).toMatchObject({ type: 'done', result: { created: 1 } });
    expect(logger['info']).toHaveBeenCalledWith(
      expect.objectContaining({ 'user.id': 'editor' }),
      'Camp functions sync started',
    );
  });

  it('ends the stream with the failure, logged as an error, when Cevi.DB refuses', async () => {
    sync.mockRejectedValue(new SessionExpiredError('https://db.cevi.ch/groups/4046/people.json'));
    const { request, logger } = syncRequest([{ id: 541 }]);

    const frames = await framesOf(await startSync(request));

    expect(frames.at(-1)).toMatchObject({ type: 'error', failure: 'session_expired' });
    expect(logger['error']).toHaveBeenCalledWith(
      expect.objectContaining({ 'funktionen.failure': 'session_expired' }),
      expect.stringContaining('failed'),
    );
  });

  it('refuses editors outside admin and web', async () => {
    const { request } = syncRequest([{ id: 106 }]);

    const response = await startSync(request);

    expect(response.status).toBe(403);
    expect(sync).not.toHaveBeenCalled();
  });
});
