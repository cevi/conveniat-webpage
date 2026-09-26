import type { CollectionBeforeOperationHook, CollectionConfig, Config, Plugin } from 'payload';

/**
 * Saves every MCP create and update as a draft, whatever the client asked for.
 *
 * An MCP client could otherwise pass `draft: false` or `_status: 'published'` and put its
 * edit live without an editor looking at it. Forcing the draft here, per operation, holds
 * for every tool the plugin registers, including bulk updates through `where`.
 */
const saveMcpWritesAsDrafts: CollectionBeforeOperationHook = ({
  args,
  collection,
  operation,
  req,
}) => {
  if (req.payloadAPI !== 'MCP') return args;
  if (operation !== 'create' && operation !== 'update') return args;
  if (!Boolean(collection.versions?.drafts)) return args;

  const data: Record<string, unknown> = {
    ...(args.data as Record<string, unknown> | undefined),
    _status: 'draft',
  };
  delete data['_localized_status'];
  return { ...args, data, draft: true };
};

/**
 * Adds {@link saveMcpWritesAsDrafts} to every collection.
 *
 * @param plugin - the configured `mcpPlugin`
 * @returns the plugin, followed by the draft enforcement
 */
export const mcpWritesDraftsOnly =
  (plugin: Plugin): Plugin =>
  async (incomingConfig: Config): Promise<Config> => {
    const config = await plugin(incomingConfig);
    return {
      ...config,
      collections: (config.collections ?? []).map(
        (collection: CollectionConfig): CollectionConfig => ({
          ...collection,
          hooks: {
            ...collection.hooks,
            beforeOperation: [...(collection.hooks?.beforeOperation ?? []), saveMcpWritesAsDrafts],
          },
        }),
      ),
    };
  };
