import { withLocaleParameter } from '@/features/payload-cms/payload-cms/utils/document-download-name';
import type { Permission } from '@/features/payload-cms/payload-types';
import {
  buildSnippet,
  containsAllWords,
  countContainedWords,
  parseSearchWords,
} from '@/features/payload-cms/search/search-text';
import type {
  SearchDocumentDetails,
  SearchLinkedPage,
  SearchMatch,
  SearchPeriod,
  SearchResult,
  SearchResultType,
  SiteSearchOptions,
  SiteSearchResponse,
} from '@/features/payload-cms/search/search-types';
import { getLanguagePrefix } from '@/features/payload-cms/utils/get-language-prefix';
import type { Locale } from '@/types/types';
import { hasPermissions } from '@/utils/has-permissions';
import { withSpan } from '@/utils/tracing-helpers';
import config from '@payload-config';
import type { Payload, Where } from 'payload';
import { getPayload } from 'payload';

/** Enough for every result a person reads; a word like "cevi" matches far more. */
const MAX_HITS = 400;
const MAX_MATCHES_PER_DOCUMENT = 20;
const DAY_MS = 24 * 60 * 60 * 1000;

const SLUG_BY_TYPE = {
  page: 'generic-page',
  document: 'documents',
  news: 'timeline',
} as const satisfies Record<SearchResultType, string>;

interface IndexHit {
  entryId: string;
  id: string;
  type: SearchResultType;
  title: string;
  date: string | undefined;
  categories: string[];
}

interface EligiblePage extends SearchLinkedPage {
  id: string;
}

const emptyCounts = (): Record<SearchResultType, number> => ({ page: 0, document: 0, news: 0 });

const typeOfSlug = (slug: string): SearchResultType | undefined =>
  (Object.keys(SLUG_BY_TYPE) as SearchResultType[]).find((type) => SLUG_BY_TYPE[type] === slug);

const relationValueId = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && 'id' in value) {
    return typeof value.id === 'string' ? value.id : undefined;
  }
  return undefined;
};

const pageUrl = (locale: Locale, urlSlug: string): string =>
  `/${[getLanguagePrefix(locale), urlSlug].filter((segment) => segment !== '').join('/')}`;

/** Every word in the title or the text; the index stores the text of a PDF with the document. */
const matchesEveryWord = (words: string[]): Where[] =>
  words.map((word) => ({
    or: [{ search_title: { like: word } }, { search_content: { like: word } }],
  }));

const findIndexHits = async (
  payload: Payload,
  locale: Locale,
  words: string[],
): Promise<IndexHit[]> => {
  const { docs } = await payload.find({
    collection: 'search-collection',
    locale,
    depth: 0,
    limit: MAX_HITS,
    pagination: false,
    select: { doc: true, search_title: true, search_date: true, search_categories: true },
    where: {
      and: [
        // the Mongo adapter finds nothing for `in` on a polymorphic relationTo, `equals` works
        {
          or: Object.values(SLUG_BY_TYPE).map((slug) => ({ 'doc.relationTo': { equals: slug } })),
        },
        ...matchesEveryWord(words),
      ],
    },
  });

  return docs.flatMap((entry): IndexHit[] => {
    const type = typeOfSlug(entry.doc.relationTo);
    const id = relationValueId(entry.doc.value);
    if (type === undefined || id === undefined) return [];
    return [
      {
        entryId: entry.id,
        id,
        type,
        title: entry.search_title ?? '',
        date: entry.search_date ?? undefined,
        categories: entry.search_categories ?? [],
      },
    ];
  });
};

/** The indexed text of pages and news entries, for their excerpt. */
const findIndexedTexts = async (
  payload: Payload,
  locale: Locale,
  entryIds: string[],
): Promise<Map<string, string>> => {
  if (entryIds.length === 0) return new Map();
  const { docs } = await payload.find({
    collection: 'search-collection',
    locale,
    depth: 0,
    pagination: false,
    select: { search_content: true },
    where: { id: { in: entryIds } },
  });
  return new Map(docs.map((entry) => [entry.id, entry.search_content ?? '']));
};

/** The index entries of the pages that link to any of the documents or news categories. */
const findLinkingPages = async (
  payload: Payload,
  locale: Locale,
  referenceIds: string[],
): Promise<{ pageId: string; references: string[] }[]> => {
  if (referenceIds.length === 0) return [];
  const { docs } = await payload.find({
    collection: 'search-collection',
    locale,
    depth: 0,
    pagination: false,
    select: { doc: true, search_references: true },
    where: {
      and: [
        { 'doc.relationTo': { equals: 'generic-page' } },
        { search_references: { in: referenceIds } },
      ],
    },
  });
  return docs.flatMap((entry) => {
    const pageId = relationValueId(entry.doc.value);
    return pageId === undefined ? [] : [{ pageId, references: entry.search_references ?? [] }];
  });
};

/**
 * The pages a visitor of this request may open: published in the locale, released, and permitted
 * to them. The index holds public pages only, but a page can change after it was indexed.
 */
const findEligiblePages = async (
  payload: Payload,
  locale: Locale,
  pageIds: string[],
): Promise<Map<string, EligiblePage>> => {
  if (pageIds.length === 0) return new Map();
  const { docs } = await payload.find({
    collection: 'generic-page',
    locale,
    depth: 1,
    pagination: false,
    select: { content: { pageTitle: true, permissions: true }, seo: { urlSlug: true } },
    where: {
      and: [
        { id: { in: pageIds } },
        { 'content.releaseDate': { less_than_equal: new Date().toISOString() } },
        { _localized_status: { equals: { published: true } } },
      ],
    },
  });
  const permitted = await Promise.all(
    docs.map((page) => hasPermissions(page.content.permissions as Permission | undefined)),
  );
  return new Map(
    docs
      .filter((_, index) => permitted[index] === true)
      .map((page) => [
        page.id,
        { id: page.id, title: page.content.pageTitle, url: pageUrl(locale, page.seo.urlSlug) },
      ]),
  );
};

const linkedPagesOf = (
  referenceId: string,
  linkingPages: { pageId: string; references: string[] }[],
  eligiblePages: Map<string, EligiblePage>,
): EligiblePage[] => {
  const pages = new Map<string, EligiblePage>();
  for (const { pageId, references } of linkingPages) {
    const page = eligiblePages.get(pageId);
    if (page !== undefined && references.includes(referenceId)) pages.set(pageId, page);
  }
  return [...pages.values()];
};

const fileTypeLabel = (filename: string | null | undefined): string | undefined => {
  if (typeof filename !== 'string') return undefined;
  const dot = filename.lastIndexOf('.');
  return dot > 0 && dot < filename.length - 1 ? filename.slice(dot + 1).toUpperCase() : undefined;
};

/** The pages that hold every word, or, when none does, the pages that hold any of them. */
const findMatches = (pageTexts: string[], words: string[]): SearchMatch[] => {
  const pages = pageTexts.map((text, index) => ({ text, page: index + 1 }));
  const withAll = pages.filter(({ text }) => containsAllWords(text, words));
  const matching =
    withAll.length > 0 ? withAll : pages.filter(({ text }) => countContainedWords(text, words) > 0);
  return matching
    .slice(0, MAX_MATCHES_PER_DOCUMENT)
    .map(({ text, page }) => ({ page, snippet: buildSnippet(text, words) }));
};

const findDocumentResults = async (
  payload: Payload,
  locale: Locale,
  hits: IndexHit[],
  words: string[],
  linkingPages: { pageId: string; references: string[] }[],
  eligiblePages: Map<string, EligiblePage>,
): Promise<SearchResult[]> => {
  if (hits.length === 0) return [];
  const hitById = new Map(hits.map((hit) => [hit.id, hit]));
  const { docs } = await payload.find({
    collection: 'documents',
    locale,
    depth: 1,
    pagination: false,
    select: {
      title: true,
      filename: true,
      url: true,
      mimeType: true,
      filesize: true,
      pdfThumbnailUrl: true,
      pdfPages: true,
      permissions: true,
      updatedAt: true,
    },
    where: { id: { in: [...hitById.keys()] } },
  });
  const permitted = await Promise.all(
    docs.map((document) => hasPermissions(document.permissions as Permission | undefined)),
  );

  return docs.flatMap((document, index): SearchResult[] => {
    const hit = hitById.get(document.id);
    const linkedFrom = linkedPagesOf(document.id, linkingPages, eligiblePages);
    if (
      hit === undefined ||
      permitted[index] !== true ||
      linkedFrom.length === 0 ||
      typeof document.url !== 'string'
    ) {
      return [];
    }

    const pageTexts = (document.pdfPages ?? []).map((page) => page.text ?? '');
    const matches = findMatches(pageTexts, words);
    const fileUrl = withLocaleParameter(document.url, locale);
    const details: SearchDocumentDetails = {
      fileUrl,
      filename: document.filename ?? '',
      mimeType: document.mimeType ?? '',
      updatedAt: document.updatedAt,
      typeLabel: fileTypeLabel(document.filename),
      isPdf: document.mimeType === 'application/pdf',
      filesize: document.filesize ?? undefined,
      pageCount: pageTexts.length > 0 ? pageTexts.length : undefined,
      thumbnailUrl: document.pdfThumbnailUrl ?? undefined,
      matches,
      linkedFrom: linkedFrom.map(({ title, url }) => ({ title, url })),
    };
    return [
      {
        key: `document:${document.id}`,
        type: 'document',
        title: hit.title,
        url: fileUrl,
        excerpt: matches[0]?.snippet ?? '',
        date: hit.date,
        document: details,
      },
    ];
  });
};

const findNewsResults = async (
  payload: Payload,
  locale: Locale,
  hits: IndexHit[],
  texts: Map<string, string>,
  words: string[],
  linkingPages: { pageId: string; references: string[] }[],
  eligiblePages: Map<string, EligiblePage>,
): Promise<SearchResult[]> => {
  if (hits.length === 0) return [];
  // the index keeps an entry that was unpublished, so the published state is read again
  const { docs } = await payload.find({
    collection: 'timeline',
    locale,
    depth: 0,
    pagination: false,
    select: { title: true },
    where: {
      and: [
        { id: { in: hits.map((hit) => hit.id) } },
        { _localized_status: { equals: { published: true } } },
      ],
    },
  });
  const published = new Set(docs.map((entry) => entry.id));

  return hits.flatMap((hit): SearchResult[] => {
    if (!published.has(hit.id)) return [];
    const shownOn = hit.categories
      .flatMap((category) => linkedPagesOf(category, linkingPages, eligiblePages))
      .at(0);
    if (shownOn === undefined) return [];
    return [
      {
        key: `news:${hit.id}`,
        type: 'news',
        title: hit.title,
        url: `${shownOn.url}#news-${hit.id}`,
        excerpt: buildSnippet(texts.get(hit.entryId) ?? '', words),
        date: hit.date,
        shownOn: { title: shownOn.title, url: shownOn.url },
      },
    ];
  });
};

const isInPeriod = (date: string | undefined, period: SearchPeriod, now: Date): boolean => {
  if (period === 'any') return true;
  if (date === undefined) return false;
  const time = new Date(date).getTime();
  const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();
  switch (period) {
    case 'month': {
      return time >= now.getTime() - 30 * DAY_MS;
    }
    case 'year': {
      return time >= startOfYear;
    }
    case 'older': {
      return time < startOfYear;
    }
  }
};

/** Titles first: a title with the whole query, then one with every word, then the text. */
const relevanceOf = (result: SearchResult, query: string, words: string[]): number => {
  const title = result.title.toLowerCase();
  let score = 0;
  if (title.includes(query.toLowerCase())) score += 50;
  if (containsAllWords(title, words)) score += 20;
  score += countContainedWords(title, words) * 5;
  score += Math.min(result.document?.matches.length ?? 0, 5);
  return score;
};

const byDateDescending = (a: SearchResult, b: SearchResult): number =>
  (b.date ?? '').localeCompare(a.date ?? '');

/**
 * Searches the public pages, the documents they link to and the news entries they show. A
 * document or a news entry is only found through a page the visitor may open, which is how a
 * stray upload or a news entry of an unpublished page stays out of the results.
 *
 * It reads the session to check page permissions, so it is bound to the request and not cached.
 */
export const searchSite = async (
  locale: Locale,
  options: SiteSearchOptions,
): Promise<SiteSearchResponse> =>
  await withSpan('searchSite', async () => {
    const words = parseSearchWords(options.query);
    if (words.length === 0) {
      return { results: [], counts: emptyCounts(), total: 0, page: 1, totalPages: 0 };
    }

    const payload = await getPayload({ config });
    const hits = await findIndexHits(payload, locale, words);
    const hitsOf = (type: SearchResultType): IndexHit[] => hits.filter((hit) => hit.type === type);

    const documentHits = hitsOf('document');
    const newsHits = hitsOf('news');
    const pageHits = hitsOf('page');
    const referenceIds = [
      ...new Set([
        ...documentHits.map((hit) => hit.id),
        ...newsHits.flatMap((hit) => hit.categories),
      ]),
    ];

    const [linkingPages, texts] = await Promise.all([
      findLinkingPages(payload, locale, referenceIds),
      findIndexedTexts(
        payload,
        locale,
        [...pageHits, ...newsHits].map((hit) => hit.entryId),
      ),
    ]);
    const eligiblePages = await findEligiblePages(payload, locale, [
      ...new Set([...pageHits.map((hit) => hit.id), ...linkingPages.map((link) => link.pageId)]),
    ]);

    const pageResults = pageHits.flatMap((hit): SearchResult[] => {
      const page = eligiblePages.get(hit.id);
      if (page === undefined) return [];
      return [
        {
          key: `page:${hit.id}`,
          type: 'page',
          title: page.title,
          url: page.url,
          excerpt: buildSnippet(texts.get(hit.entryId) ?? '', words),
          date: hit.date,
        },
      ];
    });
    const [documentResults, newsResults] = await Promise.all([
      findDocumentResults(payload, locale, documentHits, words, linkingPages, eligiblePages),
      findNewsResults(payload, locale, newsHits, texts, words, linkingPages, eligiblePages),
    ]);

    const now = new Date();
    const inPeriod = [...pageResults, ...documentResults, ...newsResults].filter((result) =>
      isInPeriod(result.date, options.period, now),
    );
    const counts = emptyCounts();
    for (const result of inPeriod) counts[result.type] += 1;

    const chosen =
      options.types.length === 0
        ? inPeriod
        : inPeriod.filter((result) => options.types.includes(result.type));
    const sorted =
      options.sort === 'newest'
        ? chosen.toSorted(byDateDescending)
        : chosen.toSorted((a, b) => {
            const difference =
              relevanceOf(b, options.query, words) - relevanceOf(a, options.query, words);
            return difference === 0 ? byDateDescending(a, b) : difference;
          });

    const totalPages = Math.ceil(sorted.length / options.pageSize);
    const page = Math.min(Math.max(options.page, 1), Math.max(totalPages, 1));
    return {
      results: sorted.slice((page - 1) * options.pageSize, page * options.pageSize),
      counts,
      total: sorted.length,
      page,
      totalPages,
    };
  });
