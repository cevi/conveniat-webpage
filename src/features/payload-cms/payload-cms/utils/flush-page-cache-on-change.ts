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

  console.log(`Revalidating cache for ${collectionSlug}:${id}`);
  setTimeout(() => {
    try {
      revalidateTag('payload', 'max');
      revalidateTag(`collection:${collectionSlug}`, 'max');
      revalidateTag(`doc:${collectionSlug}:${id}`, 'max');

      // If permissions change, flush generic pages since they rely on auth checks
      if (collectionSlug === 'permissions') {
        console.log('Permission changed -> Flushing generic-page cache entirely.');
        revalidateTag('collection:generic-page', 'max');
      }
    } catch {
      console.warn('Revalidate failed (non-critical)');
    }
  });
};

export const flushPageCacheOnChangeGlobal: GlobalAfterChangeHook = ({ req }): void => {
  if (Boolean(req.context['disableRevalidation'])) {
    return;
  }
  console.log(`Flush all pages due to Global change`);
  setTimeout(() => {
    try {
      revalidateTag('payload', 'max');
    } catch {
      console.warn('Revalidate failed (non-critical)');
    }
  });
};

export const flushManifestCacheOnChange: GlobalAfterChangeHook = (): void => {
  console.log('PWA Global afterChange hook triggered --> revalidating manifest');
  setTimeout(() => {
    try {
      revalidateTag('manifest', 'max');
    } catch {
      console.warn('Revalidate manifest failed (non-critical)');
    }
  });
};
