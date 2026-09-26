'use client';

import { format, labels } from '@/features/material/components/material-labels';
import {
  focusRing,
  MaterialButton,
  NativeSelect,
} from '@/features/material/components/material-ui';
import type { Pagination } from '@/features/material/hooks/use-list-state';
import { useMaterialLocale } from '@/features/material/hooks/use-material';
import { PAGE_SIZES, pageLinks, type PageSize } from '@/features/material/utils/list-view';
import { cn } from '@/utils/tailwindcss-override';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type React from 'react';

const pageButton = cn(
  'inline-flex h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg px-2 text-sm font-semibold tabular-nums disabled:cursor-not-allowed disabled:opacity-40',
  focusRing,
);

/**
 * The foot of a paged list. A phone loads more rows below the ones already seen, which a thumb
 * reaches without aiming; a wider container gets numbered pages with an ellipsis, and a choice
 * of how many rows a page holds. Which one shows is decided by the list's own width, so the
 * surrounding element needs `@container`.
 */
export const ListPager: React.FC<{
  pagination: Pagination;
  /** called after a page change, to bring the top of the list back into view */
  onNavigate?: () => void;
}> = ({ pagination, onNavigate }) => {
  const locale = useMaterialLocale();
  const { slice, total, pageSize } = pagination;
  if (total === 0) return <></>;
  const go = (page: number): void => {
    pagination.setPage(page);
    onNavigate?.();
  };
  const numbered = slice.pageCount > 1;

  return (
    <div className="border-t border-gray-100 px-3 py-3 text-sm text-gray-600">
      {/* narrow: load more */}
      <div className="flex flex-col items-stretch gap-2 @[42rem]:hidden">
        {slice.hasPrevious && (
          <MaterialButton variant="secondary" onClick={pagination.loadPrevious}>
            {labels.loadPrevious[locale]}
          </MaterialButton>
        )}
        <p className="text-center tabular-nums" aria-live="polite">
          {slice.hasPrevious
            ? format(labels.range, locale, { from: slice.start + 1, to: slice.end, total })
            : format(labels.shownOf, locale, { n: slice.end, total })}
        </p>
        {slice.hasMore && (
          <MaterialButton variant="secondary" onClick={pagination.loadMore}>
            {labels.loadMore[locale]}
          </MaterialButton>
        )}
      </div>

      {/* wide: numbered pages */}
      <div className="hidden flex-wrap items-center justify-between gap-3 @[42rem]:flex">
        <div className="flex items-center gap-3">
          <span className="tabular-nums" aria-live="polite">
            {format(labels.range, locale, { from: slice.start + 1, to: slice.end, total })}
          </span>
          {total > PAGE_SIZES[0] && (
            <label className="flex items-center gap-2">
              <span className="whitespace-nowrap">{labels.pageSize[locale]}</span>
              <NativeSelect
                className="h-11 w-20"
                value={pageSize}
                onChange={(event) => {
                  pagination.setPageSize(Number(event.target.value) as PageSize);
                  onNavigate?.();
                }}
              >
                {PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </NativeSelect>
            </label>
          )}
        </div>
        {numbered && (
          <nav aria-label={labels.pagination[locale]} className="flex items-center gap-1">
            <button
              type="button"
              className={pageButton}
              aria-label={labels.previousPage[locale]}
              disabled={slice.page <= 1}
              onClick={() => go(slice.page - 1)}
            >
              <ChevronLeft className="size-4" aria-hidden />
            </button>
            {pageLinks(slice.page, slice.pageCount).map((link) =>
              typeof link === 'number' ? (
                <button
                  key={link}
                  type="button"
                  className={cn(
                    pageButton,
                    link === slice.page
                      ? 'bg-conveniat-green text-white'
                      : 'text-gray-700 hover:bg-gray-100',
                  )}
                  aria-label={format(labels.pageNumber, locale, { n: link })}
                  aria-current={link === slice.page ? 'page' : undefined}
                  onClick={() => go(link)}
                >
                  {link}
                </button>
              ) : (
                <span key={link} className="px-1 text-gray-400" aria-hidden>
                  …
                </span>
              ),
            )}
            <button
              type="button"
              className={pageButton}
              aria-label={labels.nextPage[locale]}
              disabled={slice.page >= slice.pageCount}
              onClick={() => go(slice.page + 1)}
            >
              <ChevronRight className="size-4" aria-hidden />
            </button>
          </nav>
        )}
      </div>
    </div>
  );
};
