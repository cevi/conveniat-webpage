import type { CollectionBeforeChangeHook } from 'payload';

export const trackSlugHistory: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  if (originalDoc?.seo?.urlSlug && data?.seo?.urlSlug && originalDoc.seo.urlSlug !== data.seo.urlSlug) {
      const currentHistory = Array.isArray(data.seo.urlSlugHistory)
        ? data.seo.urlSlugHistory
        : Array.isArray(originalDoc.seo?.urlSlugHistory)
          ? originalDoc.seo.urlSlugHistory
          : [];

      // Avoid duplicates
      const alreadyExists = currentHistory.some(
        (item: { slug?: string }) => item.slug === originalDoc.seo.urlSlug,
      );

      if (!alreadyExists) {
        data.seo.urlSlugHistory = [{ slug: originalDoc.seo.urlSlug }, ...currentHistory];
      }
    }
  return data;
};
