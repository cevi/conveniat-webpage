import { environmentVariables as env } from '@/config/environment-variables';
import {
  hasAccessToThisHelper,
  Roles,
  shouldHideInAdminPanelIfNotAdmin,
} from '@/features/payload-cms/payload-cms/access-rules/roles';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import { mcpPlugin } from '@payloadcms/plugin-mcp';
import type { CollectionConfig, DefaultValue } from 'payload';

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
 * A key is nearly always minted for the admin creating it, so prefill the owner instead
 * of making them pick themselves out of a relationship list holding every CeviDB account.
 * The field stays editable, so a key can still be issued on someone else's behalf.
 */
const defaultToCurrentUser: DefaultValue = ({ user }) => user?.id;

const MCP_ENDPOINT = `${env.APP_HOST_URL}/api/mcp`;

/**
 * Shown above the list and on every key. The endpoint is built from `APP_HOST_URL`, so it
 * always names the environment the admin is actually looking at.
 */
const apiKeyCollectionDescription = {
  en:
    `Bearer tokens that let an MCP client (Claude, Cursor, …) read and edit content. ` +
    `Point the client at ${MCP_ENDPOINT} and send the key as the header ` +
    `"Authorization: Bearer <key>". Every capability below is off until you tick it, and ` +
    `the key can never do more than the user it belongs to. Copy the key right after ` +
    `saving — it is only readable while the document is open.`,
  de:
    `Bearer-Tokens, mit denen ein MCP-Client (Claude, Cursor, …) Inhalte lesen und ` +
    `bearbeiten kann. Den Client auf ${MCP_ENDPOINT} richten und den Schlüssel als Header ` +
    `"Authorization: Bearer <Schlüssel>" mitschicken. Alle Berechtigungen unten sind ` +
    `deaktiviert, bis du sie anhakst, und ein Schlüssel kann nie mehr als die Person, der ` +
    `er gehört. Schlüssel direkt nach dem Speichern kopieren — er ist nur sichtbar, ` +
    `solange das Dokument offen ist.`,
  fr:
    `Jetons Bearer qui permettent à un client MCP (Claude, Cursor, …) de lire et de ` +
    `modifier du contenu. Dirigez le client vers ${MCP_ENDPOINT} et envoyez la clé dans ` +
    `l'en-tête "Authorization: Bearer <clé>". Toutes les capacités ci-dessous sont ` +
    `désactivées tant que vous ne les cochez pas, et une clé ne peut jamais faire plus ` +
    `que la personne à qui elle appartient. Copiez la clé juste après l'enregistrement — ` +
    `elle n'est lisible que tant que le document est ouvert.`,
};

const userFieldDescription = {
  en:
    'The user this key acts as. Every read and write the MCP client makes is checked ' +
    "against this user's roles, so the key inherits their permissions — and nothing more. " +
    'Defaults to you.',
  de:
    'Die Person, in deren Namen der Schlüssel handelt. Jeder Lese- und Schreibzugriff des ' +
    'MCP-Clients wird gegen ihre Rollen geprüft; der Schlüssel erbt also genau ihre ' +
    'Berechtigungen — nicht mehr. Standardmässig du selbst.',
  fr:
    "L'utilisateur au nom duquel la clé agit. Chaque lecture et écriture du client MCP est " +
    'vérifiée avec ses rôles : la clé hérite donc de ses permissions, et de rien de plus. ' +
    'Par défaut, vous-même.',
};

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
      description: apiKeyCollectionDescription,
      group: AdminPanelDashboardGroups.InternalCollections,
      hidden: shouldHideInAdminPanelIfNotAdmin,
      defaultColumns: ['label', 'user', 'description', 'updatedAt'],
    },
    // `admin` is replaced rather than spread: `RelationshipField` is a union over a single
    // vs. a multi `relationTo`, and spreading the old `admin` across both branches produces
    // a cross product TypeScript rejects. The plugin only puts `description` there, and that
    // is exactly what we are overwriting.
    fields: collection.fields.map((field) =>
      field.type === 'relationship' && field.name === 'user'
        ? {
            ...field,
            admin: { description: userFieldDescription },
            defaultValue: defaultToCurrentUser,
          }
        : field,
    ),
    access: {
      read: isFullAdmin,
      create: isFullAdmin,
      update: isFullAdmin,
      delete: isFullAdmin,
      unlock: isFullAdmin,
    },
  }),
});
