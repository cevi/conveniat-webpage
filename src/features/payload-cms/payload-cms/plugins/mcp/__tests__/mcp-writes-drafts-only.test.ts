import { mcpWritesDraftsOnly } from '@/features/payload-cms/payload-cms/plugins/mcp/mcp-writes-drafts-only';
import type { CollectionBeforeOperationHook, CollectionConfig, Config, Plugin } from 'payload';

type HookArguments = Parameters<CollectionBeforeOperationHook>[0];

const pages: CollectionConfig = {
  slug: 'generic-page',
  fields: [],
  versions: { drafts: true },
};
const plain: CollectionConfig = { slug: 'plain', fields: [] };

const withCollections =
  (collections: CollectionConfig[]): Plugin =>
  (config: Config): Config => ({ ...config, collections });

const runHook = async (
  collection: CollectionConfig,
  call: { api: string; operation: string; args: Record<string, unknown> },
): Promise<Record<string, unknown>> => {
  const config = await mcpWritesDraftsOnly(withCollections([collection]))({} as Config);
  const hooks = config.collections?.[0]?.hooks?.beforeOperation ?? [];
  let args: unknown = call.args;
  for (const hook of hooks) {
    args =
      (await hook({
        args,
        collection,
        operation: call.operation,
        req: { payloadAPI: call.api },
      } as unknown as HookArguments)) ?? args;
  }
  return args as Record<string, unknown>;
};

describe('mcpWritesDraftsOnly', () => {
  it('saves an MCP update that asks to publish as a draft', async () => {
    const args = await runHook(pages, {
      api: 'MCP',
      operation: 'update',
      args: {
        draft: false,
        data: { title: 'x', _status: 'published', _localized_status: { published: true } },
      },
    });

    expect(args['draft']).toBe(true);
    expect(args['data']).toEqual({ title: 'x', _status: 'draft' });
  });

  it('saves an MCP create as a draft', async () => {
    const args = await runHook(pages, {
      api: 'MCP',
      operation: 'create',
      args: { data: { title: 'x' } },
    });

    expect(args['draft']).toBe(true);
    expect(args['data']).toEqual({ title: 'x', _status: 'draft' });
  });

  it('lets the admin panel publish', async () => {
    const original = { draft: false, data: { _status: 'published' } };
    const args = await runHook(pages, { api: 'REST', operation: 'update', args: original });

    expect(args).toEqual(original);
  });

  it('leaves collections without drafts alone', async () => {
    const original = { data: { title: 'x' } };
    const args = await runHook(plain, { api: 'MCP', operation: 'update', args: original });

    expect(args).toEqual(original);
  });
});
