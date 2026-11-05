import { isDraftOnlySave } from '@/features/payload-cms/payload-cms/utils/flush-page-cache-on-change';
import type { CollectionBeforeChangeHook, CollectionSlug, PayloadRequest } from 'payload';

interface DocumentWithSeo {
  seo?: {
    urlSlug?: string;
    urlSlugHistory?: { slug?: string }[];
  };
}

/** The published document as the database stores it, every localized field keyed by locale. */
interface StoredDocument {
  _localized_status?: Partial<Record<string, { published?: boolean }>>;
  seo?: { urlSlug?: Partial<Record<string, string>> };
}

/**
 * The slug the page answers to right now in the given locale, or undefined if it is not
 * published there. Reads the database directly: a draft only writes to the versions, so the
 * document itself is still the published one, while `originalDoc` is the latest draft.
 */
const readPublishedSlug = async (
  request: PayloadRequest,
  collection: CollectionSlug,
  id: string | number,
  locale: string,
): Promise<string | undefined> => {
  const stored = (await request.payload.db.findOne({
    collection,
    req: request,
    select: { _localized_status: true, seo: { urlSlug: true } },
    where: { id: { equals: id } },
  })) as StoredDocument | null;

  if (stored?._localized_status?.[locale]?.published !== true) return undefined;
  return stored.seo?.urlSlug?.[locale];
};

/**
 * Keeps the slugs a page was published under, so that old links redirect to its current slug.
 *
 * Only a publishing save adds to the history, and only the slug that was live until then.
 * Autosave stores a draft every second, and each pause while an editor types the slug would
 * otherwise leave a fragment, the random initial slug included, that answers for the page once
 * it is published. A preview finds the page through its published slug instead, see
 * `getGenericPageBySlugHistoryCached`.
 */
export const trackSlugHistory: CollectionBeforeChangeHook = async ({
  collection,
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (operation !== 'update' || isDraftOnlySave(req)) return data;

  const id = (originalDoc as { id?: string | number } | undefined)?.id;
  const locale = req.locale;
  if (id === undefined || typeof locale !== 'string' || locale === 'all') return data;

  const incomingData = data as unknown as DocumentWithSeo;
  const existingDocument = originalDoc as unknown as DocumentWithSeo;

  const nextSlug = incomingData.seo?.urlSlug;
  if (typeof nextSlug !== 'string') return data;

  const publishedSlug = await readPublishedSlug(req, collection.slug, id, locale);
  if (publishedSlug === undefined || publishedSlug === nextSlug) return data;

  let currentHistory: { slug?: string }[] = [];
  if (Array.isArray(incomingData.seo?.urlSlugHistory)) {
    currentHistory = incomingData.seo.urlSlugHistory;
  } else if (Array.isArray(existingDocument.seo?.urlSlugHistory)) {
    currentHistory = existingDocument.seo.urlSlugHistory;
  }

  if (currentHistory.some((item) => item.slug === publishedSlug)) return data;

  if (incomingData.seo) {
    incomingData.seo.urlSlugHistory = [{ slug: publishedSlug }, ...currentHistory];
  }

  return data;
};
