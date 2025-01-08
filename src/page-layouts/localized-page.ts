import { Locale } from '@/middleware';

export type LocalizedPage = {
  locale: Locale;
  searchParams: { [key: string]: string | string[] };
};

export type LocalizedCollectionPage = LocalizedPage & {
  slugs: string[];
};
