export type LocalizedPage = {
  locale: 'de' | 'en' | 'fr';
};

export type LocalizedCollectionPage = LocalizedPage & {
  slugs: string[];
};
