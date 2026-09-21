import { stripControlCharactersFromData } from '@/features/payload-cms/payload-cms/hooks/strip-control-characters';
import type { Config, Plugin } from 'payload';

/**
 * Collections whose strings are archived artifacts rather than content. `outgoing-emails`
 * stores the raw DSN mail and the raw SMTP responses exactly as the mail server sent them,
 * and a bounce that originated from a malformed or binary message carries control characters
 * for a reason. Cleaning those would destroy the evidence someone reads when delivery breaks.
 */
const COLLECTIONS_WITH_ARCHIVED_ARTIFACTS = new Set(['outgoing-emails']);

/**
 * Attaches {@link stripControlCharactersFromData} to every collection and global.
 *
 * It runs as a plugin, and last, because plugins add their own collections while the config is
 * built: `forms` and `form-submissions` only exist once the form builder has run, and an
 * anonymous form submission is a public write path that needs the same cleanup as the admin
 * panel. Collections Payload itself appends while sanitizing, such as `payload-jobs`, are out
 * of reach of any plugin and keep their data as it is written.
 *
 * Within a collection the hook is appended rather than prepended, so that it also sees what
 * earlier `beforeChange` hooks add: `trackSlugHistory` copies the slug of an existing document
 * into `seo.urlSlugHistory`, and a legacy document carries a value that never passed through
 * this hook on the way in.
 *
 * @param config the payload configuration to extend
 */
export const stripControlCharactersPlugin: Plugin = (config: Config): Config => {
  for (const global of config.globals ?? []) {
    global.hooks = {
      ...global.hooks,
      beforeChange: [...(global.hooks?.beforeChange ?? []), stripControlCharactersFromData],
    };
  }

  for (const collection of config.collections ?? []) {
    if (COLLECTIONS_WITH_ARCHIVED_ARTIFACTS.has(collection.slug)) continue;

    collection.hooks = {
      ...collection.hooks,
      beforeChange: [...(collection.hooks?.beforeChange ?? []), stripControlCharactersFromData],
    };
  }

  return config;
};

// every other plugin leaves `order` at its default of 0, so this one runs after all of them
stripControlCharactersPlugin.order = 1;
