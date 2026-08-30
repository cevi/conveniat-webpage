import {
  hasAccessToThisHelper,
  Roles,
  shouldHideInAdminPanelIfNotAdmin,
} from '@/features/payload-cms/payload-cms/access-rules/roles';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import { mcpPlugin } from '@payloadcms/plugin-mcp';
import type { CollectionConfig } from 'payload';

/**
 * An MCP API key is a bearer token that lets an external LLM client read and write
 * CMS content on behalf of the user it is bound to, so minting, reading and revoking
 * keys is restricted to full admins — a step above the `hasAdminOrWebAccess` we use
 * for ordinary internal collections.
 *
 * The content operations themselves are still access-checked against the *key's* user
 * (the plugin runs every tool with `overrideAccess: false`), so a key never grants more
 * than its owner already has in the admin panel.
 */
const isFullAdmin = hasAccessToThisHelper({ requiredRoles: [Roles.FullAdmin] });

/**
 * Configuration for the Payload CMS MCP plugin.
 *
 * Exposes the CMS as an MCP server at `POST /api/mcp`, so MCP clients (Claude, Cursor, …)
 * can inspect and edit content. Requests must carry `Authorization: Bearer <api-key>`;
 * keys are managed in the admin panel under the `MCP API Keys` collection, where an admin
 * can additionally allow or disallow every single capability enabled below, per key.
 *
 * Only the two collections requested are exposed: `forms` (the form builder) and
 * `generic-page`. `delete` is deliberately left off for both — a deletion through an MCP
 * client is irreversible and cannot be reviewed like a draft can. Flip the flag here if
 * that is ever wanted; the per-key toggles only appear for capabilities enabled here.
 *
 * @see https://payloadcms.com/docs/plugins/mcp
 */
export const mcpPluginConfiguration = mcpPlugin({
  collections: {
    'generic-page': {
      description:
        'Generic content pages of the conveniat27 website. Localized (de/fr/en) and ' +
        'versioned with drafts: created or updated documents stay unpublished until an ' +
        'editor publishes them in the admin panel. The page content lives in the ' +
        '`content` blocks field.',
      enabled: {
        create: true,
        delete: false,
        find: true,
        update: true,
      },
    },
    forms: {
      description:
        'Forms built with the Payload form builder (registration, feedback and contact ' +
        'forms of the conveniat27 website), including their fields, confirmation ' +
        'settings and emails. Does not expose the submitted answers.',
      enabled: {
        create: true,
        delete: false,
        find: true,
        update: true,
      },
    },
  },
  mcp: {
    serverOptions: {
      instructions:
        'This server exposes the content of the conveniat27 website (a Payload CMS). ' +
        'Content is localized: pass an explicit `locale` (de, fr or en) when reading or ' +
        'writing, otherwise the default locale (de) is used. Pages are draft-enabled — ' +
        'changes need to be published by an editor before they go live.',
      serverInfo: {
        name: 'conveniat27 CMS',
        version: '1.0.0',
      },
    },
  },

  /**
   * The plugin appends its API key collection *inside* `buildConfig`, i.e. after
   * `buildSecureConfig` has applied our default access rules to every collection. Without
   * this override the collection would fall back to Payload's default access, which grants
   * every logged-in user access — and in this project every CeviDB account can log in.
   */
  overrideApiKeyCollection: (collection: CollectionConfig): CollectionConfig => ({
    ...collection,
    labels: {
      singular: {
        en: 'MCP API Key',
        de: 'MCP-API-Schlüssel',
        fr: 'Clé API MCP',
      },
      plural: {
        en: 'MCP API Keys',
        de: 'MCP-API-Schlüssel',
        fr: 'Clés API MCP',
      },
    },
    admin: {
      ...collection.admin,
      group: AdminPanelDashboardGroups.InternalCollections,
      hidden: shouldHideInAdminPanelIfNotAdmin,
    },
    access: {
      read: isFullAdmin,
      create: isFullAdmin,
      update: isFullAdmin,
      delete: isFullAdmin,
      unlock: isFullAdmin,
    },
  }),
});
