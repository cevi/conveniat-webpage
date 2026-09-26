export const PAGE_SIZES = [25, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

export interface PageWindow {
  /** first page of the window, 1-based and clamped to what exists */
  page: number;
  pageCount: number;
  /** index of the first row shown, and one past the last */
  start: number;
  end: number;
  hasPrevious: boolean;
  hasMore: boolean;
}

/**
 * The rows a list shows. A window starts at `page` and spans `loaded` pages: numbered
 * pagination keeps one page, "load more" on a phone grows the window instead of replacing it.
 */
export const pageWindow = ({
  total,
  page,
  pageSize,
  loaded = 1,
}: {
  total: number;
  page: number;
  pageSize: number;
  loaded?: number;
}): PageWindow => {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const first = Math.min(Math.max(1, Math.floor(page)), pageCount);
  const span = Math.max(1, Math.floor(loaded));
  const start = (first - 1) * pageSize;
  const end = Math.min(total, start + span * pageSize);
  return { page: first, pageCount, start, end, hasPrevious: first > 1, hasMore: end < total };
};

export type PageLink = number | 'ellipsis-start' | 'ellipsis-end';

/**
 * The page numbers worth a link: the first, the last, the current one and its neighbours,
 * with an ellipsis for every gap. A gap of one page shows the page instead, since the
 * ellipsis would take the same room.
 */
export const pageLinks = (page: number, pageCount: number, siblings = 1): PageLink[] => {
  const shown = new Set<number>([1, pageCount]);
  for (let offset = -siblings; offset <= siblings; offset += 1) {
    const candidate = page + offset;
    if (candidate >= 1 && candidate <= pageCount) shown.add(candidate);
  }
  const sorted = [...shown].toSorted((a, b) => a - b);
  const links: PageLink[] = [];
  for (const [index, value] of sorted.entries()) {
    const previous = sorted[index - 1];
    if (previous !== undefined && value - previous === 2) links.push(previous + 1);
    else if (previous !== undefined && value - previous > 2) {
      links.push(value < page ? 'ellipsis-start' : 'ellipsis-end');
    }
    links.push(value);
  }
  return links;
};

export interface BulkResult {
  id: string;
  ok: boolean;
  error?: string;
}

/** "3 done, 1 failed", and the distinct reasons for the failures. */
export const summariseBulk = (
  results: readonly BulkResult[],
): { done: number; failed: number; errors: string[] } => {
  const failures = results.filter((result) => !result.ok);
  return {
    done: results.length - failures.length,
    failed: failures.length,
    errors: [...new Set(failures.map((result) => result.error ?? ''))].filter(
      (error) => error !== '',
    ),
  };
};
