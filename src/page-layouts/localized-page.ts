import { Locale, SearchParameters } from '@/middleware';

export type LocalizedPage = {
  locale: Locale;
  searchParams: SearchParameters;
};

export type LocalizedCollectionPage = LocalizedPage & {
  slugs: string[];
};
