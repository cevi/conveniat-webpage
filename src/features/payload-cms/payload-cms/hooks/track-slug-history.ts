import type { CollectionBeforeChangeHook } from 'payload';

export const trackSlugHistory: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  const incomingData = data as Record<string, any>;
  const existingDocument = originalDoc as Record<string, any>;

  const originalSlug = existingDocument?.['seo']?.['urlSlug'];
  const nextSlug = incomingData?.['seo']?.['urlSlug'];

  if (!originalSlug || !nextSlug || originalSlug === nextSlug) {
    return data;
  }

  let currentHistory: { slug?: string }[] = [];
  if (Array.isArray(incomingData['seo']?.['urlSlugHistory'])) {
    currentHistory = incomingData['seo']['urlSlugHistory'];
  } else if (Array.isArray(existingDocument['seo']?.['urlSlugHistory'])) {
    currentHistory = existingDocument['seo']['urlSlugHistory'];
  }

  // Avoid duplicates
  const alreadyExists = currentHistory.some(
    (item: { slug?: string }) => item.slug === originalSlug,
  );

  if (alreadyExists) {
    return data;
  }

  incomingData['seo']['urlSlugHistory'] = [{ slug: originalSlug }, ...currentHistory];

  return data;
};
