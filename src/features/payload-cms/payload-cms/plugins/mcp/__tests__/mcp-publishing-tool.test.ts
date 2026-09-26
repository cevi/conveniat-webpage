import {
  createPublishingTool,
  rememberKeyAccessSettings,
} from '@/features/payload-cms/payload-cms/plugins/mcp/mcp-publishing-tool';
import type { MCPAccessSettings } from '@payloadcms/plugin-mcp';
import type { PayloadRequest } from 'payload';

interface Snapshot {
  publishingStatus?: Record<string, { published: boolean; pendingChanges: boolean }>;
  _disable_unpublishing?: boolean;
}

const user = { id: 'editor-1' };
const MAY_UPDATE_HELPER_JOBS = { helperJobs: { update: true } };

const setup = async (
  snapshot: Snapshot,
  keyToggles: Record<string, unknown> = MAY_UPDATE_HELPER_JOBS,
): Promise<{
  request: PayloadRequest;
  update: jest.Mock<Promise<unknown>, [Record<string, unknown>]>;
  findByID: jest.Mock;
}> => {
  const findByID = jest.fn().mockResolvedValue(snapshot);
  const update = jest.fn<Promise<unknown>, [Record<string, unknown>]>().mockResolvedValue({});
  const request = {
    user,
    context: {},
    payload: { findByID, update, logger: { info: jest.fn() } },
  } as unknown as PayloadRequest;
  // authenticate the way the MCP endpoint does, so the tool sees the key's toggles
  await rememberKeyAccessSettings(request, () =>
    Promise.resolve({ user, ...keyToggles } as unknown as MCPAccessSettings),
  );
  return { request, update, findByID };
};

const tool = createPublishingTool(['helper-jobs']);

const call = async (
  request: PayloadRequest,
  args: Record<string, unknown>,
): Promise<string | undefined> => {
  const response = await tool.handler({ collection: 'helper-jobs', id: 'job-1', ...args }, request);
  return response.content[0]?.text;
};

describe('setPublishingStatus', () => {
  it('publishes the latest version in one locale as the key user', async () => {
    const { request, update } = await setup({
      publishingStatus: { de: { published: false, pendingChanges: true } },
    });

    const text = await call(request, { locale: 'de', published: true });

    expect(text).toBe('Published helper-jobs/job-1 in de.');
    expect(update).toHaveBeenCalledWith({
      user,
      overrideAccess: false,
      collection: 'helper-jobs',
      id: 'job-1',
      locale: 'de',
      draft: false,
      data: { _status: 'published', _localized_status: { published: true }, _locale: 'de' },
    });
  });

  it('does not carry the MCP request, whose writes are forced into drafts', async () => {
    const { request, update } = await setup({
      publishingStatus: { de: { published: false, pendingChanges: false } },
    });

    await call(request, { locale: 'de', published: true });

    expect(update.mock.calls[0]?.[0]).not.toHaveProperty('req');
  });

  it('unpublishes a published locale', async () => {
    const { request, update } = await setup({
      publishingStatus: { de: { published: true, pendingChanges: false } },
    });

    const text = await call(request, { locale: 'de', published: false });

    expect(text).toBe('Unpublished helper-jobs/job-1 in de.');
    expect(update.mock.calls[0]?.[0]).toMatchObject({
      data: { _status: 'published', _localized_status: { published: false } },
    });
  });

  it('refuses to unpublish while a draft is pending, since that would put it live', async () => {
    const { request, update } = await setup({
      publishingStatus: { de: { published: true, pendingChanges: true } },
    });

    const text = await call(request, { locale: 'de', published: false });

    expect(text).toMatch(/unpublished draft changes/);
    expect(update).not.toHaveBeenCalled();
  });

  it('refuses to unpublish a document marked as not unpublishable', async () => {
    const { request, update } = await setup({
      publishingStatus: { de: { published: true, pendingChanges: false } },
      _disable_unpublishing: true,
    });

    expect(await call(request, { locale: 'de', published: false })).toMatch(/not unpublishable/);
    expect(update).not.toHaveBeenCalled();
  });

  it('leaves an up-to-date published document alone', async () => {
    const { request, update } = await setup({
      publishingStatus: { de: { published: true, pendingChanges: false } },
    });

    expect(await call(request, { locale: 'de', published: true })).toMatch(/already published/);
    expect(update).not.toHaveBeenCalled();
  });

  it('reports a document the key cannot read instead of throwing', async () => {
    const { request, findByID, update } = await setup({});
    findByID.mockRejectedValue(new Error('Forbidden'));

    expect(await call(request, { locale: 'de', published: true })).toMatch(/can read/);
    expect(update).not.toHaveBeenCalled();
  });

  it('refuses a key that may not update the collection, even if its owner may', async () => {
    const { request, update } = await setup(
      { publishingStatus: { de: { published: false, pendingChanges: true } } },
      { genericPage: { update: true }, helperJobs: { find: true, update: false } },
    );

    expect(await call(request, { locale: 'de', published: true })).toMatch(/may not update/);
    expect(update).not.toHaveBeenCalled();
  });

  it('refuses when the key settings are unknown', async () => {
    const { request, update } = await setup({});
    request.context = {};

    expect(await call(request, { locale: 'de', published: true })).toMatch(/may not update/);
    expect(update).not.toHaveBeenCalled();
  });

  it('rejects a collection the tool was not given', async () => {
    const { request, update } = await setup({});

    const response = await tool.handler(
      { collection: 'users', id: 'x', locale: 'de', published: true },
      request,
    );

    expect(response.content[0]?.text).toMatch(/^Error/);
    expect(update).not.toHaveBeenCalled();
  });
});
