import type { MCPAccessSettings } from '@payloadcms/plugin-mcp';
import type { PayloadRequest } from 'payload';

/**
 * Replaces the key's user with the whole user document, groups included.
 *
 * The plugin loads the key with `depth: 1` and runs every tool as the populated `key.user`.
 * A populated user carries only the users collection's `defaultPopulate` (the name), so it had
 * no `groups`, held no role, and every access rule refused it: all reads and writes of every
 * key failed with "Du hast keine Berechtigung".
 */
export const withFullKeyUser = async (
  request: PayloadRequest,
  settings: MCPAccessSettings,
): Promise<MCPAccessSettings> => {
  const keyUser = settings.user;
  const user = await request.payload.findByID({
    collection: 'users',
    id: keyUser.id,
    depth: 0,
  });
  // keeps the `collection` and `_strategy` the plugin marks the user with, like a logged-in one
  return { ...settings, user: { ...keyUser, ...user } };
};
