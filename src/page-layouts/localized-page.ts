import { Locale, SearchParameters } from '@/types';

export type LocalizedPage = {
  locale: Locale;
  searchParams: SearchParameters;
};

export type LocalizedCollectionPage = LocalizedPage & {
  slugs: string[];
};
