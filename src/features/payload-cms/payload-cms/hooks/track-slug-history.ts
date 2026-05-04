import type { CollectionBeforeChangeHook } from 'payload';

export const trackSlugHistory: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  const incomingData = data as Record<string, any>;
  const existingDocument = originalDoc as Record<string, any>;

  if (
    existingDocument?.['seo']?.['urlSlug'] &&
    incomingData?.['seo']?.['urlSlug'] &&
    existingDocument['seo']['urlSlug'] !== incomingData['seo']['urlSlug']
  ) {
    const currentHistory = Array.isArray(incomingData['seo']['urlSlugHistory'])
      ? incomingData['seo']['urlSlugHistory']
      : Array.isArray(existingDocument['seo']?.['urlSlugHistory'])
        ? existingDocument['seo']['urlSlugHistory']
        : [];

    // Avoid duplicates
    const alreadyExists = currentHistory.some(
      (item: { slug?: string }) => item.slug === existingDocument['seo']['urlSlug'],
    );

    if (!alreadyExists) {
      incomingData['seo']['urlSlugHistory'] = [
        { slug: existingDocument['seo']['urlSlug'] },
        ...currentHistory,
      ];
    }
  }
  return data;
};
