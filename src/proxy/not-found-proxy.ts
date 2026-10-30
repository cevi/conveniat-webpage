import type { PublishedPageSlugs } from '@/features/payload-cms/api/published-page-slugs';
import {
  fetchPublishedPageSlugs,
  readPublishedPageSlugsVersion,
} from '@/features/payload-cms/api/published-page-slugs';
import { slugToUrlMapping } from '@/features/payload-cms/slug-to-url-mapping';
import type { ProxyModule } from '@/proxy/types';
import { Header } from '@/types/types';
import { createLogger } from '@/utils/server-logger';
import { NextResponse } from 'next/server';

const logger = createLogger('proxy:not-found');

/** The route every path that resolves to no CMS page is rewritten to, below its locale and design. */
export const NOT_FOUND_SEGMENT = '~not-found';

const blogPrefixes = new Set(
  slugToUrlMapping
    .filter(({ slug }) => slug === 'blog')
    .flatMap(({ urlPrefix }) => Object.values(urlPrefix)),
);

/**
 * First segments below `[locale]/[design]` that the catch-all CMS route does not resolve by slug:
 * routes of their own, the special pages, the preview-only collection prefixes and the redirect
 * to the admin panel. Paths under them are left to their route.
 *
 * `not-found-proxy.test.ts` checks this list against the route folders and the route tables.
 */
export const SEGMENTS_NOT_RESOLVED_BY_SLUG = new Set([
  // routes under src/app/(frontend)/[locale]/[design]
  'app',
  'go',
  'offline',
  'preview-fallback',
  '~offline',
  NOT_FOUND_SEGMENT,
  // special pages, see special-pages-table.ts
  'suche',
  'search',
  'recherche',
  'formular-vorschau',
  'form-preview',
  'apercu-du-formulaire',
  // collections that are only ever shown as a preview
  'timeline-preview',
  // the catch-all route redirects it to /admin
  'admin',
]);

/**
 * Whether the catch-all CMS route resolves the path by slug. Every other path, the home page
 * included, is left to its route without reading anything.
 *
 * @param segments - the decoded path segments after `/{locale}/{design}`
 */
const isResolvedBySlug = (segments: string[]): boolean =>
  segments[0] !== undefined && !SEGMENTS_NOT_RESOLVED_BY_SLUG.has(segments[0]);

/**
 * Whether a path the CMS route resolves by slug has a published page.
 *
 * @param segments - the decoded path segments after `/{locale}/{design}`
 * @param slugs - the published slugs
 */
const hasPublishedPage = (segments: string[], slugs: PublishedPageSlugs): boolean => {
  const [first, ...rest] = segments;
  if (first !== undefined && blogPrefixes.has(first)) return slugs.blogPosts.has(rest.join('/'));
  return slugs.genericPages.has(segments.join('/'));
};

/** How long the slugs are kept when no change is announced, should an announcement get lost. */
const MAX_AGE_MS = 5 * 60 * 1000;
/** How often the announced version of the slugs is read from Redis. */
const VERSION_CHECK_INTERVAL_MS = 1000;
/**
 * How soon slugs read for a newly announced version are read once more. The save announces the
 * change from its `afterChange` hook, before Payload commits it, so the first read can miss it.
 */
const REREAD_AFTER_CHANGE_MS = 2000;
/**
 * How soon a path that is not in the slugs may read them again, for a page whose publishing was
 * never announced: a save outside a request, a seed, or Redis failing during the save.
 */
const RECHECK_MISS_AFTER_MS = 10 * 1000;
/** How soon a failed read is tried again. Until then every path is left to the page route. */
const RETRY_AFTER_FAILURE_MS = 30 * 1000;
/** How long a read may take before it counts as failed, so that no request hangs on Mongo. */
const READ_TIMEOUT_MS = 5000;

interface SlugIndex {
  slugs: PublishedPageSlugs | undefined;
  version: string;
  readAt: number;
  expiresAt: number;
}

let index: SlugIndex | undefined;
let pendingRead: Promise<SlugIndex> | undefined;

const fetchWithTimeout = async (): Promise<PublishedPageSlugs> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`Reading the published page slugs took longer than ${READ_TIMEOUT_MS} ms`));
    }, READ_TIMEOUT_MS);
  });
  try {
    return await Promise.race([fetchPublishedPageSlugs(), timeout]);
  } finally {
    clearTimeout(timer);
  }
};

const readSlugs = async (version: string, changed: boolean): Promise<SlugIndex> => {
  pendingRead ??= fetchWithTimeout()
    .then(
      (slugs): SlugIndex => {
        const now = Date.now();
        return {
          slugs,
          version,
          readAt: now,
          expiresAt: now + (changed ? REREAD_AFTER_CHANGE_MS : MAX_AGE_MS),
        };
      },
      (error: unknown): SlugIndex => {
        logger.warn('Could not read the published page slugs, unknown paths answer 200 for now', {
          error,
        });
        const now = Date.now();
        return { slugs: undefined, version, readAt: now, expiresAt: now + RETRY_AFTER_FAILURE_MS };
      },
    )
    .then((read) => {
      index = read;
      return read;
    })
    .finally(() => {
      pendingRead = undefined;
    });
  return await pendingRead;
};

let announcedVersion: { value: string | undefined; nextCheckAt: number } | undefined;
let pendingVersionRead: Promise<string | undefined> | undefined;

/** The announced version of the slugs, `undefined` while Redis cannot be read. */
const readAnnouncedVersion = async (): Promise<string | undefined> => {
  if (announcedVersion !== undefined && Date.now() < announcedVersion.nextCheckAt) {
    return announcedVersion.value;
  }
  pendingVersionRead ??= readPublishedPageSlugsVersion()
    .then(
      (value) => {
        announcedVersion = { value, nextCheckAt: Date.now() + VERSION_CHECK_INTERVAL_MS };
        return value;
      },
      (error: unknown): undefined => {
        logger.warn('Could not read the version of the published page slugs from Redis', {
          error,
        });
        announcedVersion = { value: undefined, nextCheckAt: Date.now() + RETRY_AFTER_FAILURE_MS };
      },
    )
    .finally(() => {
      pendingVersionRead = undefined;
    });
  return await pendingVersionRead;
};

/**
 * Whether the path may resolve to a CMS page. Anything uncertain, a failed read included, counts
 * as a page, so that the page route decides as it did before.
 */
const mayResolve = async (segments: string[]): Promise<boolean> => {
  if (!isResolvedBySlug(segments)) return true;

  const version = await readAnnouncedVersion();
  if (version === undefined) return true;

  // Only the first request and the first one after an announced change wait for the slugs.
  // Expired slugs keep answering while newer ones are read.
  let current = index;
  if (current?.version !== version) {
    if (current !== undefined) logger.debug('The published page slugs changed, reading them again');
    current = await readSlugs(version, current !== undefined);
  } else if (Date.now() >= current.expiresAt) {
    void readSlugs(version, false);
  }
  if (current.slugs === undefined || hasPublishedPage(segments, current.slugs)) return true;

  // A path about to answer 404 waits for slugs newer than expired ones, or than a miss long ago.
  const now = Date.now();
  if (now >= current.expiresAt || now - current.readAt >= RECHECK_MISS_AFTER_MS) {
    current = await readSlugs(version, false);
  }
  return current.slugs === undefined || hasPublishedPage(segments, current.slugs);
};

const decodeSegments = (pathname: string): string[] | undefined => {
  try {
    return pathname
      .split('/')
      .filter((segment) => segment.length > 0)
      .map((segment) => decodeURIComponent(segment));
  } catch {
    return undefined;
  }
};

/**
 * Rewrites a path that resolves to no published CMS page to the prerendered `~not-found` route,
 * so that it answers 404.
 *
 * The catch-all CMS route is partially prerendered, and Next.js answers with the status of its
 * prerendered shell. The slug is only known per request, so that shell is stored with 200 and the
 * `notFound()` of the page cannot change it any more. Next.js recommends checking the slug in
 * Proxy for this, see "Status codes" in the `loading.js` reference. The check reads the published
 * slugs, not the pages, and keeps them in memory until a save announces a change through Redis,
 * see `flushPageCacheOnChange`.
 *
 * Runs after the design rewrite, whose target names the locale and the design. A preview is left
 * alone: its draft is not in the published slugs.
 */
export const notFoundProxy: ProxyModule = (next) => async (request, event, response) => {
  const rewrite = response.headers.get(Header.MIDDLEWARE_REWRITES);
  const isPageRead = request.method === 'GET' || request.method === 'HEAD';
  const isPreview = request.nextUrl.searchParams.get('preview') === 'true';
  if (rewrite === null || !isPageRead || isPreview) {
    return next(request, event, response);
  }

  const [locale, design, ...segments] = decodeSegments(new URL(rewrite).pathname) ?? [];
  if (locale === undefined || design === undefined || (await mayResolve(segments))) {
    return next(request, event, response);
  }

  logger.debug('Rewriting a path without a CMS page to the 404 page', { locale });
  const notFoundUrl = new URL(`/${locale}/${design}/${NOT_FOUND_SEGMENT}`, request.url);
  return next(request, event, NextResponse.rewrite(notFoundUrl, response));
};
