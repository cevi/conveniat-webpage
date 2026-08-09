/**
 * src/cache-handlers/incremental-cache-serialization.ts
 *
 * Pure (storage agnostic) helpers for the Redis backed singular `cacheHandler`
 * (see `src/cache-handlers/incremental-cache.ts`).
 *
 * Next.js hands us `IncrementalCacheValue` objects that are **not** JSON safe:
 * `Buffer`s (`rscData`, `body`, image `buffer`) and a `Map` (`segmentData`).
 * Everything in here converts those to a JSON safe representation (base64 for
 * binary payloads, entry arrays for maps) and back again, without ever
 * throwing.
 */
import type {
  CachedFetchData,
  CachedRouteKind,
  IncrementalCacheValue,
} from 'next/dist/server/response-cache';
import type { OutgoingHttpHeaders } from 'node:http';

/**
 * Next declares `CachedRouteKind` as an ambient `const enum`, which cannot be
 * imported as a value while `isolatedModules` is enabled. These constants are
 * the (string) enum members, typed so that we can both compare against and
 * construct `IncrementalCacheValue`s.
 */
const KIND_APP_PAGE = 'APP_PAGE' as CachedRouteKind.APP_PAGE;
const KIND_APP_ROUTE = 'APP_ROUTE' as CachedRouteKind.APP_ROUTE;
const KIND_PAGES = 'PAGES' as CachedRouteKind.PAGES;
const KIND_FETCH = 'FETCH' as CachedRouteKind.FETCH;
const KIND_REDIRECT = 'REDIRECT' as CachedRouteKind.REDIRECT;
const KIND_IMAGE = 'IMAGE' as CachedRouteKind.IMAGE;

/**
 * Key prefix for all route/response cache entries. Deliberately distinct from
 * the keys written by the `'use cache'` handlers (see
 * `src/cache-handlers/orchestrator.ts`) so both caches can share one Redis.
 */
export const ROUTE_CACHE_KEY_PREFIX = 'next-route-cache';

/** Tag registry prefix, identical to the one used by `RedisCache`. */
export const TAG_KEY_PREFIX = 'tags';

/**
 * Next stores the tags of a rendered route in this response header.
 * Mirrors `NEXT_CACHE_TAGS_HEADER` from `next/dist/lib/constants`.
 */
export const NEXT_CACHE_TAGS_HEADER = 'x-next-cache-tags';

/**
 * The fetch cache and the route/response cache use independent key spaces
 * (Next itself stores them in different directories), so we namespace them.
 */
export type RouteCacheScope = 'fetch' | 'route';

/**
 * Optional fields are stored as `undefined` (and therefore dropped by
 * `JSON.stringify`) instead of `null`, which keeps the payload small and
 * round-trips back to `undefined` - the value Next uses for "not set".
 */
interface SerializedAppPageValue {
  kind: 'APP_PAGE';
  html: string;
  /** base64 encoded `Buffer` */
  rscData?: string | undefined;
  postponed?: string | undefined;
  headers?: OutgoingHttpHeaders | undefined;
  status?: number | undefined;
  /** `Map` flattened into entries, values base64 encoded */
  segmentData?: [string, string][] | undefined;
}

interface SerializedAppRouteValue {
  kind: 'APP_ROUTE';
  /** base64 encoded `Buffer` */
  body: string;
  status: number;
  headers: OutgoingHttpHeaders;
}

interface SerializedPagesValue {
  kind: 'PAGES';
  html: string;
  pageData: object;
  headers?: OutgoingHttpHeaders | undefined;
  status?: number | undefined;
}

interface SerializedFetchValue {
  kind: 'FETCH';
  data: CachedFetchData;
  tags?: string[] | undefined;
  revalidate: number;
}

interface SerializedRedirectValue {
  kind: 'REDIRECT';
  props: object;
}

interface SerializedImageValue {
  kind: 'IMAGE';
  etag: string;
  upstreamEtag: string;
  /** base64 encoded `Buffer` */
  buffer: string;
  extension: string;
  revalidate?: number | undefined;
  isMiss?: boolean | undefined;
  isStale?: boolean | undefined;
}

export type SerializedCacheValue =
  | SerializedAppPageValue
  | SerializedAppRouteValue
  | SerializedPagesValue
  | SerializedFetchValue
  | SerializedRedirectValue
  | SerializedImageValue;

export interface SerializedCacheEntry {
  /** creation time of the entry, in milliseconds */
  lastModified: number;
  value: SerializedCacheValue;
}

/** The shape Next expects back from `CacheHandler.get`. */
export interface RouteCacheEntry {
  lastModified: number;
  value: IncrementalCacheValue;
}

/**
 * Builds the Redis key for a route/response cache entry.
 *
 * The build id is part of the key so that entries never leak across deploys
 * (a new build renders different HTML/RSC payloads).
 */
export const buildRouteCacheKey = (
  buildId: string,
  scope: RouteCacheScope,
  cacheKey: string,
): string => `${ROUTE_CACHE_KEY_PREFIX}:${buildId}:${scope}:${cacheKey}`;

/** Builds the Redis key of the set holding all cache keys for a given tag. */
export const buildTagKey = (tag: string): string => `${TAG_KEY_PREFIX}:${tag}`;

const encodeBuffer = (buffer: Buffer): string => buffer.toString('base64');

const decodeBuffer = (value: string): Buffer => Buffer.from(value, 'base64');

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' ? value : undefined;

const asBoolean = (value: unknown): boolean | undefined =>
  typeof value === 'boolean' ? value : undefined;

const asHeaders = (value: unknown): OutgoingHttpHeaders | undefined =>
  isRecord(value) ? (value as OutgoingHttpHeaders) : undefined;

const asBuffer = (value: unknown): Buffer | undefined =>
  typeof value === 'string' ? decodeBuffer(value) : undefined;

/**
 * Restores the `segmentData` `Map`. Entries that are not a
 * `[string, base64 string]` pair are dropped: a missing segment is treated by
 * Next like a segment without a prefetch, which is safe.
 */
const asSegmentData = (value: unknown): Map<string, Buffer> | undefined => {
  if (!Array.isArray(value)) return undefined;

  const entries = value as unknown[];
  const segmentData = new Map<string, Buffer>();

  for (const entry of entries) {
    if (!Array.isArray(entry)) continue;
    const [segmentPath, encoded] = entry as unknown[];
    if (typeof segmentPath !== 'string' || typeof encoded !== 'string') continue;
    segmentData.set(segmentPath, decodeBuffer(encoded));
  }

  return segmentData;
};

/**
 * Converts an `IncrementalCacheValue` into a JSON safe representation.
 *
 * Returns `undefined` for values we do not know how to encode, in which case
 * the caller must skip the write instead of storing a broken entry.
 */
export const encodeCacheValue = (
  value: IncrementalCacheValue,
): SerializedCacheValue | undefined => {
  switch (value.kind) {
    case KIND_APP_PAGE: {
      return {
        kind: 'APP_PAGE',
        html: value.html,
        rscData: value.rscData === undefined ? undefined : encodeBuffer(value.rscData),
        postponed: value.postponed,
        headers: value.headers,
        status: value.status,
        segmentData:
          value.segmentData === undefined
            ? undefined
            : [...value.segmentData].map(([segmentPath, buffer]): [string, string] => [
                segmentPath,
                encodeBuffer(buffer),
              ]),
      };
    }

    case KIND_APP_ROUTE: {
      return {
        kind: 'APP_ROUTE',
        body: encodeBuffer(value.body),
        status: value.status,
        headers: value.headers,
      };
    }

    case KIND_PAGES: {
      return {
        kind: 'PAGES',
        html: value.html,
        pageData: value.pageData,
        headers: value.headers,
        status: value.status,
      };
    }

    case KIND_FETCH: {
      return {
        kind: 'FETCH',
        data: value.data,
        tags: value.tags,
        revalidate: value.revalidate,
      };
    }

    case KIND_REDIRECT: {
      return { kind: 'REDIRECT', props: value.props };
    }

    case KIND_IMAGE: {
      return {
        kind: 'IMAGE',
        etag: value.etag,
        upstreamEtag: value.upstreamEtag,
        buffer: encodeBuffer(value.buffer),
        extension: value.extension,
        revalidate: value.revalidate,
        isMiss: value.isMiss,
        isStale: value.isStale,
      };
    }

    default: {
      return undefined;
    }
  }
};

const decodeAppPageValue = (value: Record<string, unknown>): IncrementalCacheValue | undefined => {
  const html = asString(value['html']);
  if (html === undefined) return undefined;

  return {
    kind: KIND_APP_PAGE,
    html,
    rscData: asBuffer(value['rscData']),
    postponed: asString(value['postponed']),
    headers: asHeaders(value['headers']),
    status: asNumber(value['status']),
    segmentData: asSegmentData(value['segmentData']),
  };
};

const decodeAppRouteValue = (value: Record<string, unknown>): IncrementalCacheValue | undefined => {
  const body = asBuffer(value['body']);
  const status = asNumber(value['status']);
  const headers = asHeaders(value['headers']);
  if (body === undefined || status === undefined || headers === undefined) return undefined;

  return { kind: KIND_APP_ROUTE, body, status, headers };
};

const decodePagesValue = (value: Record<string, unknown>): IncrementalCacheValue | undefined => {
  const html = asString(value['html']);
  const pageData = value['pageData'];
  if (html === undefined || !isRecord(pageData)) return undefined;

  return {
    kind: KIND_PAGES,
    html,
    pageData,
    headers: asHeaders(value['headers']),
    status: asNumber(value['status']),
  };
};

const asStringArray = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) return undefined;

  return (value as unknown[]).filter((item): item is string => typeof item === 'string');
};

const decodeFetchValue = (value: Record<string, unknown>): IncrementalCacheValue | undefined => {
  const data = value['data'];
  const revalidate = asNumber(value['revalidate']);
  if (!isRecord(data) || revalidate === undefined) return undefined;

  const body = asString(data['body']);
  const url = asString(data['url']);
  const headers = data['headers'];
  if (body === undefined || url === undefined || !isRecord(headers)) return undefined;

  const status = asNumber(data['status']);
  const fetchData: CachedFetchData = {
    headers: headers as Record<string, string>,
    body,
    url,
    ...(status === undefined ? {} : { status }),
  };

  const tags = asStringArray(value['tags']);

  return {
    kind: KIND_FETCH,
    data: fetchData,
    revalidate,
    ...(tags === undefined ? {} : { tags }),
  };
};

const decodeRedirectValue = (value: Record<string, unknown>): IncrementalCacheValue | undefined => {
  const props = value['props'];
  if (!isRecord(props)) return undefined;

  return { kind: KIND_REDIRECT, props };
};

const decodeImageValue = (value: Record<string, unknown>): IncrementalCacheValue | undefined => {
  const etag = asString(value['etag']);
  const upstreamEtag = asString(value['upstreamEtag']);
  const buffer = asBuffer(value['buffer']);
  const extension = asString(value['extension']);
  if (
    etag === undefined ||
    upstreamEtag === undefined ||
    buffer === undefined ||
    extension === undefined
  ) {
    return undefined;
  }

  const revalidate = asNumber(value['revalidate']);
  const isMiss = asBoolean(value['isMiss']);
  const isStale = asBoolean(value['isStale']);

  return {
    kind: KIND_IMAGE,
    etag,
    upstreamEtag,
    buffer,
    extension,
    ...(revalidate === undefined ? {} : { revalidate }),
    ...(isMiss === undefined ? {} : { isMiss }),
    ...(isStale === undefined ? {} : { isStale }),
  };
};

/**
 * Rebuilds an `IncrementalCacheValue` from its JSON safe representation.
 *
 * Returns `undefined` whenever the payload is malformed (unknown kind, missing
 * or wrongly typed fields) so that the caller can degrade to a cache miss.
 */
export const decodeCacheValue = (value: unknown): IncrementalCacheValue | undefined => {
  if (!isRecord(value)) return undefined;

  switch (value['kind']) {
    case 'APP_PAGE': {
      return decodeAppPageValue(value);
    }
    case 'APP_ROUTE': {
      return decodeAppRouteValue(value);
    }
    case 'PAGES': {
      return decodePagesValue(value);
    }
    case 'FETCH': {
      return decodeFetchValue(value);
    }
    case 'REDIRECT': {
      return decodeRedirectValue(value);
    }
    case 'IMAGE': {
      return decodeImageValue(value);
    }
    default: {
      return undefined;
    }
  }
};

/**
 * Serializes a cache entry into the string stored in Redis.
 *
 * Returns `undefined` if the value cannot be encoded, in which case nothing
 * should be written.
 */
export const serializeCacheEntry = (
  value: IncrementalCacheValue,
  lastModified: number,
): string | undefined => {
  const encoded = encodeCacheValue(value);
  if (encoded === undefined) return undefined;

  const entry: SerializedCacheEntry = { lastModified, value: encoded };

  try {
    return JSON.stringify(entry);
  } catch {
    // circular or otherwise non-serializable payload: treat as non-cacheable
    return undefined;
  }
};

/**
 * Parses a cache entry read from Redis.
 *
 * Never throws: invalid JSON, a missing timestamp or a malformed value all
 * result in `undefined`, i.e. a cache miss.
 */
export const deserializeCacheEntry = (raw: string): RouteCacheEntry | undefined => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    // corrupted entry, treat as a miss
    return undefined;
  }

  if (!isRecord(parsed)) return undefined;

  const lastModified = asNumber(parsed['lastModified']);
  if (lastModified === undefined) return undefined;

  const value = decodeCacheValue(parsed['value']);
  if (value === undefined) return undefined;

  return { lastModified, value };
};

/**
 * Collects the cache tags of an entry.
 *
 * Fetch entries carry their tags in the set context, rendered routes carry
 * them in the `x-next-cache-tags` response header (same source Next uses to
 * detect expired tags).
 */
export const extractCacheTags = (
  value: IncrementalCacheValue,
  contextTags?: string[],
): string[] => {
  const tags = new Set<string>(contextTags ?? []);

  if (value.kind === KIND_FETCH) {
    for (const tag of value.tags ?? []) tags.add(tag);
  } else if (
    value.kind === KIND_APP_PAGE ||
    value.kind === KIND_APP_ROUTE ||
    value.kind === KIND_PAGES
  ) {
    const header = value.headers?.[NEXT_CACHE_TAGS_HEADER];
    if (typeof header === 'string') {
      for (const tag of header.split(',')) tags.add(tag);
    }
  }

  tags.delete('');

  return [...tags];
};
