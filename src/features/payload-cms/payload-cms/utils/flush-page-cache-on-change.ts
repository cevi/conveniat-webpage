import { revalidateTag } from 'next/cache';
import type { CollectionConfig, GlobalConfig, PayloadRequest } from 'payload';

export const flushPageCacheOnChange: Partial<CollectionConfig> = {
  hooks: {
    afterChange: [
      ({ req }: { req: PayloadRequest }): void => {
        if (req.context['disableRevalidation']) {
          return;
        }
        console.log(`Flush all pages due to Generic Page change`);
        setTimeout(() => {
          try {
            revalidateTag('payload', 'max');
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
      ({ req }: { req: PayloadRequest }): void => {
        if (req.context['disableRevalidation']) {
          return;
        }
        console.log(`Flush all pages due to Generic Page change`);
        setTimeout(() => {
          try {
            revalidateTag('payload', 'max');
          } catch {
            console.warn('Revalidate failed (non-critical)');
          }
        });
      },
    ],
  },
};

