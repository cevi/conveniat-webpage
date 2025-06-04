import type { Locale } from '@/types/types';

export const slugToUrlMapping: {
  slug: string;
  urlPrefix: {
    [locale in Locale]: string;
  };
}[] = [
  {
    slug: 'blog',
    urlPrefix: { de: 'blog', en: 'blog', fr: 'blog' },
  },
  {
    slug: 'generic-page',
    urlPrefix: { de: '', en: '', fr: '' },
  },
  {
    slug: 'timeline',
    urlPrefix: { de: 'timeline-preview', en: 'timeline-preview', fr: 'timeline-preview' },
  },
];
