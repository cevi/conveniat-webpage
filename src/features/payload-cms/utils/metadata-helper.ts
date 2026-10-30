import type { Metadata } from 'next';

interface SEOType {
  urlSlug: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  keywords?: string | null;
}
export function buildMetadata({
  seo,
  canonicalLocale,
  canonicalSlug,
  alternates,
}: {
  seo: SEOType;
  canonicalLocale: string;
  canonicalSlug: string;
  alternates: Record<string, string>;
}): Metadata {
  return {
    ...(seo.metaTitle && { title: seo.metaTitle }),
    ...(seo.metaDescription && { description: seo.metaDescription }),
    ...(seo.keywords && { keywords: seo.keywords }),
    openGraph: {
      type: 'website',
      ...(seo.metaTitle && { title: seo.metaTitle }),
      ...(seo.metaDescription && { description: seo.metaDescription }),
    },
    ...(canonicalLocale &&
      canonicalSlug && {
        alternates: {
          canonical: `/${canonicalLocale}/${canonicalSlug}`,
          languages: alternates,
        },
      }),
  };
}
