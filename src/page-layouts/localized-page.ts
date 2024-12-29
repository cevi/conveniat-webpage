import { Locale } from '@/middleware';

export type LocalizedPage = {
  locale: Locale;
};

export type LocalizedCollectionPage = LocalizedPage & {
  slugs: string[];
};
