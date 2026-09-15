import { revalidateTag } from 'next/cache';
import type { CollectionAfterChangeHook, GlobalAfterChangeHook } from 'payload';

export const flushPageCacheOnChange: CollectionAfterChangeHook = ({
  doc,
  collection,
  req,
}): void => {
  if (Boolean(req.context['disableRevalidation'])) {
    return;
  }
  const collectionSlug = collection.slug;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const id = doc.id as string | number;

  req.payload.logger.debug(
    { collection: collectionSlug, 'document.id': id },
    'Revalidating the cache for a document',
  );
  try {
    revalidateTag('payload', 'max');
    revalidateTag(`collection:${collectionSlug}`, 'max');
    revalidateTag(`doc:${collectionSlug}:${id}`, 'max');

    // If permissions change, flush generic pages since they rely on auth checks
    if (collectionSlug === 'permissions') {
      req.payload.logger.debug('Permissions changed, flushing the generic-page cache entirely');
      revalidateTag('collection:generic-page', 'max');
    }
  } catch (error: unknown) {
    req.payload.logger.warn(
      { error, collection: collectionSlug },
      'Revalidating the cache failed, this is non-critical',
    );
  }
};

export const flushPageCacheOnChangeGlobal: GlobalAfterChangeHook = ({ req, global }): void => {
  if (Boolean(req.context['disableRevalidation'])) {
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
