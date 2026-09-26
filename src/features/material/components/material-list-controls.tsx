'use client';

import { format, labels } from '@/features/material/components/material-labels';
import {
  focusRing,
  inputClass,
  MaterialButton,
  MaterialSheet,
  NativeSelect,
  SheetFooter,
} from '@/features/material/components/material-ui';
import type { Pagination } from '@/features/material/hooks/use-list-state';
import { useMaterialLocale } from '@/features/material/hooks/use-material';
import {
  ariaSort,
  PAGE_SIZES,
  pageLinks,
  type PageSize,
  type SortState,
} from '@/features/material/utils/list-view';
import { cn } from '@/utils/tailwindcss-override';
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import type React from 'react';
import { useState } from 'react';

/**
 * A row or page checkbox inside a 44 px target. `some` shows the dash of a partial selection;
 * the property only exists in the DOM, so it is set through the ref.
 */
export const SelectCheckbox: React.FC<{
  state: 'none' | 'some' | 'all';
  label: string;
  /** `shift` when the shift key was held, for a range */
  onChange: (shift: boolean) => void;
  className?: string;
}> = ({ state, label, onChange, className }) => (
  <label
    className={cn('flex size-11 shrink-0 cursor-pointer items-center justify-center', className)}
    onClick={(event) => event.stopPropagation()}
  >
    <input
      type="checkbox"
      aria-label={label}
      className="accent-conveniat-green focus-visible:outline-conveniat-green size-5 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2"
      checked={state === 'all'}
      ref={(element) => {
        if (element) element.indeterminate = state === 'some';
      }}
      // React reports a checkbox change from its click, which knows about the shift key
      onChange={(event) =>
        onChange(event.nativeEvent instanceof MouseEvent && event.nativeEvent.shiftKey)
      }
    />
  </label>
);

/** A sortable column header; the `<th>` around it carries `aria-sort`. */
export const SortHeader = <Key extends string>({
  sortKey,
  sort,
  onSort,
  children,
  align = 'left',
}: {
  sortKey: Key;
  sort: SortState<Key>;
  onSort: (key: Key) => void;
  children: React.ReactNode;
  align?: 'left' | 'right';
}): React.ReactElement => {
  const direction = ariaSort(sort, sortKey);
  let Icon = ChevronsUpDown;
  if (direction === 'ascending') Icon = ArrowUp;
  if (direction === 'descending') Icon = ArrowDown;
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={cn(
        'inline-flex min-h-11 max-w-full cursor-pointer items-center gap-1 rounded-md font-semibold tracking-wide whitespace-nowrap uppercase hover:text-gray-900',
        align === 'right' && 'flex-row-reverse',
        direction !== 'none' && 'text-gray-900',
        focusRing,
      )}
    >
      <span className="truncate">{children}</span>
      <Icon
        className={cn('size-3.5 shrink-0', direction === 'none' && 'text-gray-300')}
        aria-hidden
      />
    </button>
  );
};

/** Props for a `<th>` that sorts: its `aria-sort`, so a screen reader hears the order. */
export const sortProperties = <Key extends string>(
  sort: SortState<Key>,
  key: Key,
): { 'aria-sort': 'ascending' | 'descending' | 'none' } => ({ 'aria-sort': ariaSort(sort, key) });

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

export interface FilterChip {
  key: string;
  label: string;
  onRemove: () => void;
}

/**
 * Search and filters above a list. A wide list shows its filters in one row. On a phone only
 * the search stays in view: the rest open in a bottom sheet from the "Filter" button, which
 * counts what is active, and every active filter shows as a chip that one tap removes.
 */
export const FilterBar: React.FC<{
  search: string;
  onSearch: (value: string) => void;
  searchPlaceholder: string;
  /** the filter controls in the wide row, compact and labelled by `aria-label` */
  inlineControls: React.ReactNode;
  /** the same controls in the phone's sheet, with visible labels */
  sheetControls: React.ReactNode;
  chips: FilterChip[];
  onClearAll: () => void;
  /** how many rows the filters leave, for the sheet's button */
  resultCount: number;
  /** a control that stays next to the search at every width, such as a layout switch */
  trailing?: React.ReactNode;
}> = ({
  search,
  onSearch,
  searchPlaceholder,
  inlineControls,
  sheetControls,
  chips,
  onClearAll,
  resultCount,
  trailing,
}) => {
  const locale = useMaterialLocale();
  const [open, setOpen] = useState(false);
  const active = chips.length;

  return (
    <div className="space-y-2 border-b border-gray-100 p-3">
      {/* wide: the search, then the filters in a row of their own, one row once there is room */}
      <div className="flex flex-wrap gap-2 @[60rem]:flex-nowrap">
        <div className="relative min-w-0 flex-1 @[60rem]:max-w-80">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400"
            aria-hidden
          />
          <input
            type="search"
            aria-label={searchPlaceholder}
            className={cn(inputClass, 'pl-9')}
            placeholder={searchPlaceholder}
            value={search}
            onChange={(event) => onSearch(event.target.value)}
          />
        </div>
        <MaterialButton
          variant="secondary"
          className="px-3 @[42rem]:hidden"
          aria-label={labels.filter[locale]}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <SlidersHorizontal aria-hidden />
          {/* the label goes first when a layout switch shares the row with the search */}
          <span
            className={cn('hidden', trailing === undefined ? '@[22rem]:inline' : '@[30rem]:inline')}
          >
            {labels.filter[locale]}
          </span>
          {active > 0 && (
            <span className="bg-conveniat-green flex size-5 items-center justify-center rounded-full text-[11px] text-white tabular-nums">
              {active}
            </span>
          )}
        </MaterialButton>
        <div className="order-last hidden w-full min-w-0 gap-2 @[42rem]:flex @[60rem]:order-none @[60rem]:w-auto @[60rem]:flex-[2]">
          <div className="flex min-w-0 flex-1 gap-2 [&>*]:min-w-0 [&>*]:flex-1">
            {inlineControls}
          </div>
          {active > 0 && (
            <MaterialButton
              variant="ghost"
              className="w-11 px-0"
              aria-label={labels.resetFilters[locale]}
              title={labels.resetFilters[locale]}
              onClick={onClearAll}
            >
              <X aria-hidden />
            </MaterialButton>
          )}
        </div>
        {trailing}
      </div>

      {active > 0 && (
        <ul className="flex flex-wrap gap-2 @[42rem]:hidden">
          {chips.map((chip) => (
            <li key={chip.key}>
              <button
                type="button"
                aria-label={format(labels.removeFilter, locale, { name: chip.label })}
                onClick={chip.onRemove}
                className={cn(
                  'bg-conveniat-green/10 text-conveniat-green inline-flex h-11 max-w-[16rem] cursor-pointer items-center gap-1.5 rounded-full pr-2.5 pl-3.5 text-sm font-semibold',
                  focusRing,
                )}
              >
                <span className="truncate">{chip.label}</span>
                <X className="size-4 shrink-0" aria-hidden />
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={onClearAll}
              className={cn(
                'inline-flex h-11 cursor-pointer items-center rounded-full px-3 text-sm font-semibold text-gray-600 underline underline-offset-2',
                focusRing,
              )}
            >
              {labels.clearAll[locale]}
            </button>
          </li>
        </ul>
      )}

      <MaterialSheet open={open} onOpenChange={setOpen} title={labels.filter[locale]}>
        <div className="space-y-4">
          {sheetControls}
          <SheetFooter className="grid grid-cols-[auto_1fr] gap-2">
            <MaterialButton variant="ghost" disabled={active === 0} onClick={onClearAll}>
              {labels.resetFilters[locale]}
            </MaterialButton>
            <MaterialButton onClick={() => setOpen(false)}>
              {format(labels.showResults, locale, { n: resultCount })}
            </MaterialButton>
          </SheetFooter>
        </div>
      </MaterialSheet>
    </div>
  );
};
