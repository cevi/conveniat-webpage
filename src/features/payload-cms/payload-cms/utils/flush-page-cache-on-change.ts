import { revalidateTag } from 'next/cache';
import type { CollectionConfig, GlobalConfig } from 'payload';

export const flushPageCacheOnChange: Partial<CollectionConfig> = {
  hooks: {
    afterChange: [
      (): void => {
        console.log(`Flush all pages due to Generic Page change`);
        revalidateTag('payload', 'max');
      },
    ],
  },
};

export const flushPageCacheOnChangeGlobal: Partial<GlobalConfig> = {
  hooks: {
    afterChange: [
      (): void => {
        console.log(`Flush all pages due to Generic Page change`);
        revalidateTag('payload', 'max');
      },
    ],
  },
};
