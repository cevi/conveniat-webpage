import {
  buildRouteCacheKey,
  buildTagKey,
  decodeCacheValue,
  deserializeCacheEntry,
  extractCacheTags,
  NEXT_CACHE_TAGS_HEADER,
  ROUTE_CACHE_KEY_PREFIX,
  serializeCacheEntry,
} from '@/cache-handlers/incremental-cache-serialization';
import type { CachedRouteKind, IncrementalCacheValue } from 'next/dist/server/response-cache';

const KIND_APP_PAGE = 'APP_PAGE' as CachedRouteKind.APP_PAGE;
const KIND_APP_ROUTE = 'APP_ROUTE' as CachedRouteKind.APP_ROUTE;
const KIND_FETCH = 'FETCH' as CachedRouteKind.FETCH;
const KIND_IMAGE = 'IMAGE' as CachedRouteKind.IMAGE;

const roundTrip = (value: IncrementalCacheValue): IncrementalCacheValue => {
  const serialized = serializeCacheEntry(value, 1000);
  expect(serialized).toBeDefined();

  const entry = deserializeCacheEntry(serialized ?? '');
  if (entry === undefined) throw new Error('entry could not be deserialized');
  expect(entry.lastModified).toBe(1000);

  return entry.value;
};

describe('buildRouteCacheKey', () => {
  it('namespaces entries by prefix, build id and scope', () => {
    expect(buildRouteCacheKey('abc123', 'route', '/index')).toBe(
      `${ROUTE_CACHE_KEY_PREFIX}:abc123:route:/index`,
    );
    expect(buildRouteCacheKey('abc123', 'fetch', 'deadbeef')).toBe(
      `${ROUTE_CACHE_KEY_PREFIX}:abc123:fetch:deadbeef`,
    );
  });

  it('separates builds, scopes and the "use cache" key space', () => {
    const first = buildRouteCacheKey('build-1', 'route', '/index');
    const second = buildRouteCacheKey('build-2', 'route', '/index');
    const fetchScoped = buildRouteCacheKey('build-1', 'fetch', '/index');

    expect(first).not.toBe(second);
    expect(first).not.toBe(fetchScoped);
    expect(first.startsWith(`${ROUTE_CACHE_KEY_PREFIX}:`)).toBe(true);
    expect(first.startsWith('tags:')).toBe(false);
  });

  it('keeps the tag registry compatible with the "use cache" handler', () => {
    expect(buildTagKey('my-tag')).toBe('tags:my-tag');
  });
});

describe('serializeCacheEntry / deserializeCacheEntry', () => {
  it('round-trips an APP_PAGE entry including Buffer and Map values', () => {
    const rscData = Buffer.from([0, 1, 2, 253, 254, 255]);
    const segmentData = new Map<string, Buffer>([
      ['/_index', Buffer.from('segment-one', 'utf8')],
      ['/blog/$slug', Buffer.from([255, 0, 128])],
    ]);

    const value = roundTrip({
      kind: KIND_APP_PAGE,
      html: '<html>hi</html>',
      rscData,
      postponed: 'postponed-state',
      headers: { 'x-custom': 'value' },
      status: 200,
      segmentData,
    });

    expect(value.kind).toBe('APP_PAGE');
    if (value.kind !== KIND_APP_PAGE) throw new Error('unexpected kind');

    expect(value.html).toBe('<html>hi</html>');
    expect(value.postponed).toBe('postponed-state');
    expect(value.status).toBe(200);
    expect(value.headers).toEqual({ 'x-custom': 'value' });

    expect(Buffer.isBuffer(value.rscData)).toBe(true);
    expect(value.rscData?.equals(rscData)).toBe(true);

    expect(value.segmentData).toBeInstanceOf(Map);
    expect([...(value.segmentData ?? [])].map(([segmentPath]) => segmentPath)).toEqual([
      '/_index',
      '/blog/$slug',
    ]);
    expect(value.segmentData?.get('/_index')?.toString('utf8')).toBe('segment-one');
    expect(value.segmentData?.get('/blog/$slug')?.equals(Buffer.from([255, 0, 128]))).toBe(true);
  });

  it('preserves undefined optional fields of an APP_PAGE entry', () => {
    const value = roundTrip({
      kind: KIND_APP_PAGE,
      html: '<html></html>',
      rscData: undefined,
      postponed: undefined,
      headers: undefined,
      status: undefined,
      segmentData: undefined,
    });

    if (value.kind !== KIND_APP_PAGE) throw new Error('unexpected kind');

    expect(value.rscData).toBeUndefined();
    expect(value.postponed).toBeUndefined();
    expect(value.headers).toBeUndefined();
    expect(value.status).toBeUndefined();
    expect(value.segmentData).toBeUndefined();
  });

  it('round-trips an APP_ROUTE body buffer', () => {
    const body = Buffer.from([1, 2, 3, 250]);
    const value = roundTrip({
      kind: KIND_APP_ROUTE,
      body,
      status: 201,
      headers: { 'content-type': 'application/json' },
    });

    if (value.kind !== KIND_APP_ROUTE) throw new Error('unexpected kind');

    expect(Buffer.isBuffer(value.body)).toBe(true);
    expect(value.body.equals(body)).toBe(true);
    expect(value.status).toBe(201);
    expect(value.headers).toEqual({ 'content-type': 'application/json' });
  });

  it('round-trips an IMAGE buffer and its optional flags', () => {
    const buffer = Buffer.from([9, 8, 7]);
    const value = roundTrip({
      kind: KIND_IMAGE,
      etag: 'etag',
      upstreamEtag: 'upstream-etag',
      buffer,
      extension: 'webp',
      revalidate: 60,
    });

    if (value.kind !== KIND_IMAGE) throw new Error('unexpected kind');

    expect(value.buffer.equals(buffer)).toBe(true);
    expect(value.extension).toBe('webp');
    expect(value.revalidate).toBe(60);
    expect(value.isMiss).toBeUndefined();
  });

  it('round-trips a FETCH entry', () => {
    const value = roundTrip({
      kind: KIND_FETCH,
      data: {
        headers: { 'content-type': 'application/json' },
        body: '{"a":1}',
        url: 'https://example.com/api',
        status: 200,
      },
      tags: ['tag-a', 'tag-b'],
      revalidate: 120,
    });

    if (value.kind !== KIND_FETCH) throw new Error('unexpected kind');

    expect(value.data.body).toBe('{"a":1}');
    expect(value.data.url).toBe('https://example.com/api');
    expect(value.data.status).toBe(200);
    expect(value.tags).toEqual(['tag-a', 'tag-b']);
    expect(value.revalidate).toBe(120);
  });
});

describe('deserializeCacheEntry (malformed input)', () => {
  it('returns undefined instead of throwing', () => {
    expect(deserializeCacheEntry('not json at all')).toBeUndefined();
    expect(deserializeCacheEntry('')).toBeUndefined();
    expect(deserializeCacheEntry('null')).toBeUndefined();
    expect(deserializeCacheEntry('"a string"')).toBeUndefined();
    expect(deserializeCacheEntry('{}')).toBeUndefined();
    expect(
      deserializeCacheEntry(JSON.stringify({ value: { kind: 'APP_PAGE', html: 'x' } })),
    ).toBeUndefined();
    expect(deserializeCacheEntry('{"lastModified":1,"value":null}')).toBeUndefined();
  });

  it('rejects unknown and incomplete cache values', () => {
    expect(decodeCacheValue('not an object')).toBeUndefined();
    expect(decodeCacheValue(42)).toBeUndefined();
    expect(decodeCacheValue({ kind: 'SOMETHING_ELSE' })).toBeUndefined();
    expect(decodeCacheValue({ kind: 'APP_PAGE' })).toBeUndefined();
    expect(decodeCacheValue({ kind: 'APP_PAGE', html: 42 })).toBeUndefined();
    expect(decodeCacheValue({ kind: 'APP_ROUTE', body: 'AQI=', status: 200 })).toBeUndefined();
    expect(decodeCacheValue({ kind: 'IMAGE', etag: 'a', buffer: 'AQI=' })).toBeUndefined();
  });

  it('drops malformed segment entries instead of failing the whole entry', () => {
    const value = decodeCacheValue({
      kind: 'APP_PAGE',
      html: '<html></html>',
      segmentData: [
        ['/_index', Buffer.from('ok', 'utf8').toString('base64')],
        ['/broken'],
        'not-an-entry',
        [1, 2],
      ],
    });

    expect(value).toBeDefined();
    if (value?.kind !== KIND_APP_PAGE) throw new Error('unexpected kind');

    expect(value.segmentData?.size).toBe(1);
    expect(value.segmentData?.get('/_index')?.toString('utf8')).toBe('ok');
  });
});

describe('extractCacheTags', () => {
  it('reads the tags of a rendered route from the cache tags header', () => {
    const tags = extractCacheTags({
      kind: KIND_APP_PAGE,
      html: '<html></html>',
      rscData: undefined,
      postponed: undefined,
      headers: { [NEXT_CACHE_TAGS_HEADER]: 'tag-a,tag-b,' },
      status: 200,
      segmentData: undefined,
    });

    expect(tags).toEqual(['tag-a', 'tag-b']);
  });

  it('merges the context tags of a fetch entry and de-duplicates', () => {
    const tags = extractCacheTags(
      {
        kind: KIND_FETCH,
        data: { headers: {}, body: '', url: 'https://example.com' },
        tags: ['tag-a'],
        revalidate: 10,
      },
      ['tag-b', 'tag-a'],
    );

    expect([...tags].sort()).toEqual(['tag-a', 'tag-b']);
  });

  it('returns an empty list when no tags are present', () => {
    expect(
      extractCacheTags({
        kind: KIND_APP_ROUTE,
        body: Buffer.from('x'),
        status: 200,
        headers: {},
      }),
    ).toEqual([]);
  });
});
