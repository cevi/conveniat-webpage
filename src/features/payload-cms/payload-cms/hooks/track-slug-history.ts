import type { CollectionBeforeChangeHook } from 'payload';

interface DocumentWithSeo {
  seo?: {
    urlSlug?: string;
    urlSlugHistory?: { slug?: string }[];
  };
}

export const trackSlugHistory: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  const incomingData = data as unknown as DocumentWithSeo;
  const existingDocument = originalDoc as unknown as DocumentWithSeo;

  const originalSlug = existingDocument.seo?.urlSlug;
  const nextSlug = incomingData.seo?.urlSlug;

  if (
    typeof originalSlug !== 'string' ||
    typeof nextSlug !== 'string' ||
    originalSlug === nextSlug
  ) {
    return data;
  }

  let currentHistory: { slug?: string }[] = [];
  if (Array.isArray(incomingData.seo?.urlSlugHistory)) {
    currentHistory = incomingData.seo.urlSlugHistory;
  } else if (Array.isArray(existingDocument.seo?.urlSlugHistory)) {
    currentHistory = existingDocument.seo.urlSlugHistory;
  }

  // Avoid duplicates
  const alreadyExists = currentHistory.some(
    (item: { slug?: string }) => item.slug === originalSlug,
  );

  if (alreadyExists) {
    return data;
  }

  if (incomingData.seo) {
    incomingData.seo.urlSlugHistory = [{ slug: originalSlug }, ...currentHistory];
  }

  return data;
};
