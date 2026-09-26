import type { LocaleCode } from '@/features/payload-cms/payload-cms/locales';
import { enabledLocales } from '@/features/payload-cms/payload-cms/locales';
import type { CollectionSlug, PayloadRequest } from 'payload';
import { z } from 'zod';

interface ToolResponse {
  content: Array<{ text: string; type: 'text' }>;
}

interface PublishingState {
  published?: boolean;
  pendingChanges?: boolean;
}

interface PublishingSnapshot {
  publishingStatus?: Record<string, PublishingState | undefined>;
  _disable_unpublishing?: boolean | null;
}

/**
 * The name the MCP plugin derives the per-key checkbox from (`setPublishingStatus`), so
 * `overrideApiKeyCollection` can find the field again.
 */
export const PUBLISHING_TOOL_NAME = 'setPublishingStatus';

const reply = (text: string): ToolResponse => ({ content: [{ type: 'text', text }] });

/**
 * Builds the MCP tool that publishes or unpublishes one document in one locale.
 *
 * Every other MCP write is forced into a draft (see `mcpWritesDraftsOnly`), so without this
 * tool an MCP client can prepare content but never put it live or take it down. Publishing
 * is kept as its own tool so an admin grants it per key, separately from `update`.
 *
 * It does what the Publish and Unpublish buttons of the admin panel do: the latest version,
 * draft included, becomes the published one for the given locale, and the other locales keep
 * their state. The write runs as the key's user with `overrideAccess: false`, so the key can
 * never publish what its owner could not publish in the admin panel.
 *
 * @param collections - slugs of the draft-enabled, localized collections the tool may touch
 * @returns the tool definition for `mcpPlugin({ mcp: { tools } })`
 */
export const createPublishingTool = (
  collections: [CollectionSlug, ...CollectionSlug[]],
): {
  name: string;
  description: string;
  parameters: z.ZodRawShape;
  handler: (args: Record<string, unknown>, request: PayloadRequest) => Promise<ToolResponse>;
} => {
  const parameters = {
    collection: z.enum(collections).describe('Slug of the collection the document belongs to.'),
    id: z.string().describe('ID of the document.'),
    locale: z
      .enum(enabledLocales as [LocaleCode, ...LocaleCode[]])
      .describe('Locale to publish or unpublish. The other locales are left as they are.'),
    published: z
      .boolean()
      .describe('true publishes the latest version, draft included; false unpublishes.'),
  };
  const schema = z.object(parameters);

  return {
    name: PUBLISHING_TOOL_NAME,
    description:
      'Publish or unpublish one document in one locale, like the Publish / Unpublish ' +
      'button in the admin panel. Publishing puts the latest draft live. Unpublishing ' +
      'hides the document in that locale without deleting it, and is refused while the ' +
      'locale has unpublished draft changes or the document is marked as not ' +
      `unpublishable. Works on: ${collections.join(', ')}.`,
    parameters,
    handler: async (
      args: Record<string, unknown>,
      request: PayloadRequest,
    ): Promise<ToolResponse> => {
      const parsed = schema.safeParse(args);
      if (!parsed.success) return reply(`Error: ${parsed.error.message}`);
      const { collection, id, locale, published } = parsed.data;
      const { payload, user } = request;

      // A fresh local request on purpose: `mcpWritesDraftsOnly` forces every write carrying
      // the MCP request into a draft, and this tool is the one write that must not be.
      const asKeyUser = { user, overrideAccess: false } as const;

      let snapshot: PublishingSnapshot;
      try {
        snapshot = (await payload.findByID({
          ...asKeyUser,
          collection,
          id,
          depth: 0,
          draft: false,
          select: { publishingStatus: true, _disable_unpublishing: true },
        })) as PublishingSnapshot;
      } catch {
        return reply(`Error: no document ${id} in ${collection} that this key can read.`);
      }

      const state = snapshot.publishingStatus?.[locale] ?? {};
      if (published && state.published === true && state.pendingChanges !== true) {
        return reply(`${collection}/${id} is already published in ${locale}, nothing changed.`);
      }
      if (!published) {
        if (state.published !== true) {
          return reply(`${collection}/${id} is not published in ${locale}, nothing changed.`);
        }
        if (snapshot._disable_unpublishing === true) {
          return reply(`Error: ${collection}/${id} is marked as not unpublishable.`);
        }
        // Unpublishing saves the latest version as well, which would put a pending draft live
        // on the way out. The admin panel hides its Unpublish button in that state too.
        if (state.pendingChanges === true) {
          return reply(
            `Error: ${collection}/${id} has unpublished draft changes in ${locale}. ` +
              'Publish or discard them in the admin panel first.',
          );
        }
      }

      try {
        await payload.update({
          ...asKeyUser,
          collection,
          id,
          locale,
          draft: false,
          data: {
            _status: 'published',
            _localized_status: { published },
            ...(published ? { _locale: locale } : {}),
          },
        });
      } catch (error) {
        return reply(`Error: ${error instanceof Error ? error.message : String(error)}`);
      }

      payload.logger.info(
        `[mcp] ${published ? 'published' : 'unpublished'} ${collection}/${id} in ${locale} ` +
          `as user ${String(user?.id)}`,
      );
      return reply(`${published ? 'Published' : 'Unpublished'} ${collection}/${id} in ${locale}.`);
    },
  };
};
