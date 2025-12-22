import { revalidateTag } from 'next/cache';
import type { CollectionConfig, GlobalConfig } from 'payload';

export const flushPageCacheOnChange: Partial<CollectionConfig> = {
  hooks: {
    afterChange: [
      ({ doc, collection, req }): void => {
        if (req.context['disableRevalidation']) {
          return;
        }
        const collectionSlug = collection.slug;
        const id = doc.id;

        console.log(`Revalidating cache for ${collectionSlug}:${id}`);
        setTimeout(() => {
          try {
            revalidateTag('payload', 'max');
            revalidateTag(`collection:${collectionSlug}`, 'max');
            revalidateTag(`doc:${collectionSlug}:${id}`, 'max');
          } catch {
            console.warn('Revalidate failed (non-critical)');
          }
        });
      },
    ],
  },
};

export const flushPageCacheOnChangeGlobal: Partial<GlobalConfig> = {
  hooks: {
    afterChange: [
      ({ req }): void => {
        if (req.context['disableRevalidation']) {
          return;
        }
        console.log(`Flush all pages due to Global change`);
        setTimeout(() => {
          try {
            revalidateTag('payload', 'max');
          } catch {
            // do nothing
          }
        });
      },
    ],
  },
};
