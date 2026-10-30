import type { CollectionSlug, FilterOptionsProps, PayloadRequest, Where } from 'payload';

/** Collections without a per-locale publishing status: every document may be linked. */
const collectionsWithoutLocalizedStatus = new Set<string>([
  'images',
  'documents',
  'camp-map-annotations',
  'camp-schedule-entry',
  'forms',
  'users',
  'permissions',
]);

/** Matches no document at all: every document has an id. */
const matchesNothing: Where = { id: { exists: false } };

/**
 * The ids of the documents published in `locale`, read once per request.
 *
 * Payload resolves filter options for every relationship field of a form, so one form-state request
 * would otherwise repeat the same query for each link on the page.
 */
const publishedIds = (
  request: PayloadRequest,
  collection: CollectionSlug,
  locale: string,
): Promise<(string | number)[]> => {
  const key = `publishedIds:${collection}:${locale}`;
  const cached = request.context[key] as Promise<(string | number)[]> | undefined;
  if (cached !== undefined) return cached;

  const ids = request.payload
    .find({
      collection,
      locale: locale as never,
      draft: false,
      depth: 0,
      pagination: false,
      select: {},
      where: { _localized_status: { equals: { published: true } } },
    })
    .then((result) => result.docs.map((document) => document.id));
  request.context[key] = ids;
  return ids;
};

/**
 * Limits a link to documents published in the edited locale.
 *
 * The filter is a list of ids, read on the server, and not a condition on `_localized_status`. The
 * admin panel sends the filter of a relationship field back to the REST API as a query string, where
 * `true` arrives as the string `"true"`, and Payload turns that back into a boolean for checkbox
 * fields only. On the JSON field `_localized_status` it stayed a string, matched nothing, and no
 * page or blog post could be picked in a link field.
 */
export const filterOptionsOnlyPublished = async ({
  relationTo,
  req,
}: FilterOptionsProps<unknown>): Promise<Where> => {
  if (req.context['autoTranslating'] === true) {
    return {};
  }

  if (collectionsWithoutLocalizedStatus.has(relationTo)) {
    return {};
  }

  // the admin's own locale, `all` included, has no published status of its own: use the default
  const locale = req.locale === undefined || req.locale === 'all' ? 'de' : req.locale;
  const ids = await publishedIds(req, relationTo, locale);
  return ids.length === 0 ? matchesNothing : { id: { in: ids } };
};
