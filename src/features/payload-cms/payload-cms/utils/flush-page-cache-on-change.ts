import { linkTargetPopulate } from '@/features/payload-cms/payload-cms/utils/link-target-populate';
import { revalidateTag } from 'next/cache';
import type {
  CollectionAfterChangeHook,
  CollectionBeforeOperationHook,
  CollectionSlug,
  GlobalAfterChangeHook,
  GlobalBeforeOperationHook,
  PayloadRequest,
  SelectType,
} from 'payload';

/** The `req.context` key under which the `draft` flag of the running save is recorded. */
const IS_DRAFT_SAVE = 'isDraftSave';

/** The `req.context` key under which {@link rememberLinkTarget} records what it read. */
const LINK_TARGET_BEFORE_SAVE = 'linkTargetBeforeSave';

interface LinkTargetBeforeSave {
  collection: string;
  id: string | number;
  state: string | undefined;
}

/**
 * Everything of a page or blog article that reaches a cache entry other than its own.
 *
 * Documents linking to it embed {@link linkTargetPopulate}. The lookups by slug, by slug history
 * and by `internalPageName` only match published, untrashed documents, so a read that found
 * nothing turns stale when one of these changes.
 */
const linkTargetSelect: SelectType = {
  ...linkTargetPopulate,
  seo: { urlSlug: true, urlSlugHistory: true },
  _localized_status: true,
  _status: true,
  deletedAt: true,
  internalPageName: true,
};

const hasDrafts = (config: { versions?: unknown }): boolean =>
  typeof config.versions === 'object' &&
  config.versions !== null &&
  'drafts' in config.versions &&
  Boolean(config.versions.drafts);

/**
 * A save with `draft: true` and no `_status: 'published'` is written to the versions only, see
 * `isSavingDraft` in Payload's `updateDocument`. The published document stays as it is.
 */
const savesDraftOnly = (operationArguments: unknown): boolean => {
  if (typeof operationArguments !== 'object' || operationArguments === null) return false;
  const { draft, data } = operationArguments as { draft?: unknown; data?: { _status?: unknown } };
  return draft === true && data?._status !== 'published';
};

/**
 * Records whether the running save only writes a draft.
 *
 * Autosave and unpublishing both reach `afterChange` as `_status: 'draft'`. Only the operation's
 * `draft` argument tells them apart, and `beforeOperation` is the last hook that sees it. Add it
 * to every collection with drafts that flushes the cache, or each autosave flushes it.
 */
export const rememberDraftSave: CollectionBeforeOperationHook = ({ args, operation, req }) => {
  if (operation === 'create' || operation === 'update') {
    req.context[IS_DRAFT_SAVE] = savesDraftOnly(args);
  }
  return args;
};

/** {@link rememberDraftSave} for a global. */
export const rememberDraftSaveGlobal: GlobalBeforeOperationHook = ({ args, operation, req }) => {
  if (operation === 'update') {
    req.context[IS_DRAFT_SAVE] = savesDraftOnly(args);
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- Payload types the arguments as any
  return args;
};

/**
 * Whether the save left the published document untouched. Drafts are never served from the
 * cache, so there is nothing to flush for them. Without the recorded flag the answer is no, which
 * costs a flush and never a stale page.
 */
const wasDraftSave = (
  request: PayloadRequest,
  config: { versions?: unknown },
  document_: unknown,
): boolean =>
  request.context[IS_DRAFT_SAVE] === true &&
  hasDrafts(config) &&
  (document_ as { _status?: unknown })._status !== 'published';

/**
 * Reads the published document from the database, in every locale. The local API would set the
 * locale of the request it is given, which is the request of the save that is still running.
 */
const readLinkTarget = async (
  request: PayloadRequest,
  collection: CollectionSlug,
  id: string | number,
): Promise<string | undefined> => {
  const document_ = await request.payload.db.findOne({
    collection,
    req: request,
    select: linkTargetSelect,
    where: { id: { equals: id } },
  });
  return document_ === null ? undefined : JSON.stringify(document_);
};

/**
 * Records what other cache entries hold of a page before it is saved, so that
 * {@link flushPageCacheOnChange} can tell a change of its content from a change that reaches
 * further. `previousDoc` does not answer that: it is the latest draft, where autosave has stored
 * the new slug long before the page is published.
 *
 * Add it to a collection whose `defaultPopulate` is {@link linkTargetPopulate}.
 */
export const rememberLinkTarget: CollectionBeforeOperationHook = async ({
  args,
  collection,
  operation,
  req,
}) => {
  const id = (args as { id?: string | number }).id;
  // a draft flushes nothing, and an update of many documents flushes everything
  if (operation !== 'update' || id === undefined || savesDraftOnly(args)) return args;

  try {
    const before: LinkTargetBeforeSave = {
      collection: collection.slug,
      id,
      state: await readLinkTarget(req, collection.slug, id),
    };
    req.context[LINK_TARGET_BEFORE_SAVE] = before;
  } catch (error: unknown) {
    req.payload.logger.warn(
      { error, collection: collection.slug },
      'Reading the link target before a save failed, the save flushes the whole cache',
    );
  }
  return args;
};

/**
 * Whether the save changed nothing but the content of the document itself. Then only the cache
 * entries that read this document are stale.
 */
const changedOwnContentOnly = async (
  request: PayloadRequest,
  collection: CollectionSlug,
  id: string | number,
): Promise<boolean> => {
  const before = request.context[LINK_TARGET_BEFORE_SAVE] as LinkTargetBeforeSave | undefined;
  if (before?.collection !== collection || before.id !== id || before.state === undefined) {
    return false;
  }
  try {
    return before.state === (await readLinkTarget(request, collection, id));
  } catch (error: unknown) {
    request.payload.logger.warn(
      { error, collection },
      'Reading the link target after a save failed, the save flushes the whole cache',
    );
    return false;
  }
};

/**
 * Flushes the cache entries a saved document is part of.
 *
 * A draft flushes nothing. A page or blog article whose link target is unchanged flushes its own
 * entries and the lists of its collection. Everything else flushes the whole cache, because any
 * entry may embed it: an image, a file or a form sits inside the pages that show it, and a slug
 * inside every page and menu linking to it.
 */
export const flushPageCacheOnChange: CollectionAfterChangeHook = async ({
  doc,
  collection,
  req,
}): Promise<void> => {
  if (Boolean(req.context['disableRevalidation'])) {
    return;
  }
  const collectionSlug = collection.slug;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const id = doc.id as string | number;

  if (wasDraftSave(req, collection, doc)) {
    req.payload.logger.debug(
      { collection: collectionSlug, 'document.id': id },
      'Draft saved, the cache keeps the published document',
    );
    return;
  }

  try {
    const flushEverything = !(await changedOwnContentOnly(req, collectionSlug, id));
    req.payload.logger.debug(
      { collection: collectionSlug, 'document.id': id, 'cache.flush_everything': flushEverything },
      'Revalidating the cache for a document',
    );

    if (flushEverything) revalidateTag('payload', 'max');
    revalidateTag(`collection:${collectionSlug}`, 'max');
    revalidateTag(`doc:${collectionSlug}:${id}`, 'max');
  } catch (error: unknown) {
    req.payload.logger.warn(
      { error, collection: collectionSlug },
      'Revalidating the cache failed, this is non-critical',
    );
  }
};

export const flushPageCacheOnChangeGlobal: GlobalAfterChangeHook = ({ doc, req, global }): void => {
  if (Boolean(req.context['disableRevalidation'])) {
    return;
  }
  if (wasDraftSave(req, global, doc)) {
    req.payload.logger.debug(
      { global: global.slug },
      'Draft saved, the cache keeps the published global',
    );
    return;
  }
  req.payload.logger.debug({ global: global.slug }, 'Flushing all pages after a global change');
  try {
    revalidateTag('payload', 'max');
    // Also expire just this global, so the per-global entries written by `cached-globals.ts`
    // can be invalidated on their own once the blanket `payload` tag is narrowed down.
    revalidateTag(`global:${global.slug}`, 'max');
  } catch (error: unknown) {
    req.payload.logger.warn(
      { error, global: global.slug },
      'Revalidating the cache failed, this is non-critical',
    );
  }
};

export const flushManifestCacheOnChange: GlobalAfterChangeHook = ({ req }): void => {
  req.payload.logger.debug('PWA global changed, revalidating the manifest');
  try {
    revalidateTag('manifest', 'max');
  } catch (error: unknown) {
    req.payload.logger.warn({ error }, 'Revalidating the manifest failed, this is non-critical');
  }
};
