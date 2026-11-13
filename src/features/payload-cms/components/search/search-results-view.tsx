'use client';

import { AppSearchBar } from '@/components/ui/app-search-bar';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button, buttonVariants } from '@/components/ui/buttons/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { SheetResetButton } from '@/components/ui/sheet-reset-button';
import { rememberSearch } from '@/features/payload-cms/components/search/recent-searches';
import type { SearchFilters } from '@/features/payload-cms/components/search/search-filter-panel';
import {
  filterChipClassName,
  SearchFilterPanel,
} from '@/features/payload-cms/components/search/search-filter-panel';
import { SearchPreview } from '@/features/payload-cms/components/search/search-preview';
import { SearchResultRow } from '@/features/payload-cms/components/search/search-result-row';
import {
  PreviewSkeleton,
  ResultListSkeleton,
  SkeletonBar,
} from '@/features/payload-cms/components/search/search-skeleton';
import { RecentSearches } from '@/features/payload-cms/components/search/search-suggestions';
import {
  allTypesLabel,
  alsoFoundLabel,
  filterLabel,
  instantErrorLabel,
  instantOfflineLabel,
  nextPageLabel,
  noQueryDescription,
  noQueryTitle,
  noResultsDescription,
  noResultsTitle,
  noResultsWithFiltersDescription,
  pageOfLabel,
  previousPageLabel,
  resetFiltersLabel,
  resetLabel,
  resultCountLabel,
  retryLabel,
  searchingLabel,
  searchPageTitle,
  searchPlaceholder,
  showAllLabel,
  showResultsLabel,
  typeLabels,
  typeLabelSingular,
} from '@/features/payload-cms/components/search/search-translations';
import { useLiveSearch } from '@/features/payload-cms/components/search/use-live-search';
import type {
  SearchResult,
  SearchResultType,
  SiteSearchResponse,
} from '@/features/payload-cms/search/search-types';
import { SEARCH_RESULT_TYPES } from '@/features/payload-cms/search/search-types';
import { useIsDesktop } from '@/hooks/use-is-desktop';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  SearchX,
  SlidersHorizontal,
  WifiOff,
} from 'lucide-react';
import type React from 'react';
import { useRef, useState } from 'react';

const DEFAULT_FILTERS: SearchFilters = { types: [], sort: 'relevance', period: 'any' };

/** "4 Seiten, 2 News": what the chosen types leave out, so nothing found goes unseen. */
const AlsoFound: React.FC<{
  counts: Record<SearchResultType, number>;
  chosenTypes: SearchResultType[];
  locale: Locale;
  onShowAll: () => void;
}> = ({ counts, chosenTypes, locale, onShowAll }) => {
  if (chosenTypes.length === 0) return;
  const others = SEARCH_RESULT_TYPES.filter(
    (type) => !chosenTypes.includes(type) && counts[type] > 0,
  );
  if (others.length === 0) return;
  return (
    <div className="bg-quiet mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-[14px] px-4 py-2 text-[14px] text-green-700">
      <Search className="h-4 w-4 shrink-0 text-green-500" aria-hidden="true" />
      <span>{alsoFoundLabel[locale]}</span>
      <span className="text-heading font-semibold">
        {others
          .map(
            (type) =>
              `${counts[type]} ${(counts[type] === 1 ? typeLabelSingular : typeLabels)[type][locale]}`,
          )
          .join(', ')}
      </span>
      <button
        type="button"
        onClick={onShowAll}
        className="text-conveniat-green ml-auto flex min-h-11 cursor-pointer items-center gap-0.5 font-semibold"
      >
        {showAllLabel[locale]}
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
};

/** A count beside a filter, a grey bar while the counts of the current query are on their way. */
const Count: React.FC<{ value: number | undefined }> = ({ value }) =>
  value === undefined ? (
    <SkeletonBar className="inline-block h-3 w-3 bg-current opacity-20" />
  ) : (
    <span className="text-[12px] opacity-75">{value}</span>
  );

/** The type chips on a phone, where the panel with the checkboxes sits in a sheet. */
const TypeChips: React.FC<{
  filters: SearchFilters;
  counts: Record<SearchResultType, number> | undefined;
  locale: Locale;
  onChange: (filters: Partial<SearchFilters>) => void;
}> = ({ filters, counts, locale, onChange }) => (
  <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6">
    <button
      type="button"
      aria-pressed={filters.types.length === 0}
      onClick={() => onChange({ types: [] })}
      className={cn(filterChipClassName(filters.types.length === 0), 'snap-start')}
    >
      {allTypesLabel[locale]}
      <Count
        value={
          counts === undefined
            ? undefined
            : SEARCH_RESULT_TYPES.reduce((sum, type) => sum + counts[type], 0)
        }
      />
    </button>
    {SEARCH_RESULT_TYPES.map((type) => {
      const isChosen = filters.types.includes(type);
      return (
        <button
          key={type}
          type="button"
          aria-pressed={isChosen}
          disabled={counts?.[type] === 0 && !isChosen}
          onClick={() =>
            onChange({
              types: isChosen
                ? filters.types.filter((chosen) => chosen !== type)
                : [...filters.types, type],
            })
          }
          className={cn(filterChipClassName(isChosen), 'snap-start')}
        >
          {typeLabels[type][locale]}
          <Count value={counts?.[type]} />
        </button>
      );
    })}
  </div>
);

const Pagination: React.FC<{
  page: number;
  totalPages: number;
  locale: Locale;
  onPage: (page: number) => void;
}> = ({ page, totalPages, locale, onPage }) => {
  if (totalPages <= 1) return;
  return (
    <nav className="mt-6 flex items-center justify-between gap-3">
      {page > 1 ? (
        <button
          type="button"
          onClick={() => onPage(page - 1)}
          className={buttonVariants({ variant: 'outlined', size: 'touch' })}
        >
          <ChevronLeft aria-hidden="true" />
          {previousPageLabel[locale]}
        </button>
      ) : (
        <span />
      )}
      <span className="text-[14px] text-green-700">{pageOfLabel(page, totalPages)[locale]}</span>
      {page < totalPages ? (
        <button
          type="button"
          onClick={() => onPage(page + 1)}
          className={buttonVariants({ variant: 'outlined', size: 'touch' })}
        >
          {nextPageLabel[locale]}
          <ChevronRight aria-hidden="true" />
        </button>
      ) : (
        <span />
      )}
    </nav>
  );
};

/**
 * The search page: the query, the filters beside the results on a wide screen or in a sheet on
 * a phone, the results, and from `xl` on a preview of the chosen one. It searches while the
 * visitor types; from the first keystroke until the answer arrives it shows skeletons, never the
 * results of the query before. The filters live in the URL, so a search can be shared.
 */
export const SearchResultsView: React.FC<{
  locale: Locale;
  query: string;
  filters: SearchFilters;
  page: number;
  response: SiteSearchResponse;
}> = ({
  locale,
  query: initialQuery,
  filters: initialFilters,
  page: initialPage,
  response: initialResponse,
}) => {
  const isDesktop = useIsDesktop();
  const search = useLiveSearch(locale, {
    query: initialQuery,
    filters: initialFilters,
    page: initialPage,
    response: initialResponse,
  });
  const { draft, filters, status, response, words } = search;
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | undefined>();
  const [isPreviewClosed, setIsPreviewClosed] = useState(false);
  const filterButtonReference = useRef<HTMLButtonElement>(null);

  const results = response?.results ?? [];
  const selected: SearchResult | undefined =
    results.find((result) => result.key === selectedKey) ?? results.at(0);
  // the column is there in every state, so the field and the list keep their width while the
  // visitor types; it only goes when they close it
  const hasPreviewColumn = !isPreviewClosed;
  const showsPreview = isDesktop && hasPreviewColumn;
  const hasFilters =
    filters.types.length > 0 ||
    filters.sort !== DEFAULT_FILTERS.sort ||
    filters.period !== DEFAULT_FILTERS.period;
  const sheetFilterCount =
    (filters.sort === DEFAULT_FILTERS.sort ? 0 : 1) +
    (filters.period === DEFAULT_FILTERS.period ? 0 : 1);

  const pickQuery = (next: string): void => {
    search.setDraft(next);
    rememberSearch(next);
  };

  const selectResult = (result: SearchResult): void => {
    setSelectedKey(result.key);
    setIsPreviewClosed(false);
    rememberSearch(draft);
  };

  const changePage = (page: number): void => {
    search.setPage(page);
    globalThis.scrollTo({ top: 0 });
  };

  const filterPanel = (
    <SearchFilterPanel
      filters={filters}
      counts={response?.counts}
      locale={locale}
      onChange={search.setFilters}
    />
  );

  const renderResults = (): React.ReactNode => {
    switch (status) {
      case 'idle': {
        return (
          <>
            <EmptyState
              icon={Search}
              title={noQueryTitle[locale]}
              description={noQueryDescription[locale]}
            />
            <RecentSearches locale={locale} onPick={pickQuery} />
          </>
        );
      }
      case 'loading': {
        return <ResultListSkeleton className="mt-4" />;
      }
      case 'offline': {
        return <EmptyState icon={WifiOff} title={instantOfflineLabel[locale]} />;
      }
      case 'error': {
        return (
          <EmptyState
            icon={SearchX}
            title={instantErrorLabel[locale]}
            action={
              <Button variant="outlined" size="touch" onClick={search.retry}>
                {retryLabel[locale]}
              </Button>
            }
          />
        );
      }
      case 'ready': {
        if (response === undefined) return;
        if (results.length === 0) {
          return (
            <>
              <EmptyState
                icon={SearchX}
                title={noResultsTitle[locale]}
                description={
                  hasFilters
                    ? noResultsWithFiltersDescription[locale]
                    : noResultsDescription[locale]
                }
                action={
                  hasFilters ? (
                    <Button
                      variant="outlined"
                      size="touch"
                      onClick={() => search.setFilters(DEFAULT_FILTERS)}
                    >
                      {resetFiltersLabel[locale]}
                    </Button>
                  ) : undefined
                }
              />
              <RecentSearches locale={locale} current={draft} onPick={pickQuery} />
            </>
          );
        }
        return (
          <>
            <Card as="ul" divided className="mt-4">
              {results.map((result) => (
                <SearchResultRow
                  key={result.key}
                  result={result}
                  words={words}
                  locale={locale}
                  isSelected={showsPreview && result.key === selected?.key}
                  onSelect={isDesktop ? selectResult : undefined}
                  onOpen={() => rememberSearch(draft)}
                />
              ))}
            </Card>
            <AlsoFound
              counts={response.counts}
              chosenTypes={filters.types}
              locale={locale}
              onShowAll={() => search.setFilters({ types: [] })}
            />
            <Pagination
              page={response.page}
              totalPages={response.totalPages}
              locale={locale}
              onPage={changePage}
            />
          </>
        );
      }
    }
  };

  let heading = searchPageTitle[locale];
  if (status === 'loading') heading = searchingLabel(draft.trim())[locale];
  if (status === 'ready' && response !== undefined && (response.total > 0 || hasFilters)) {
    heading = resultCountLabel(response.total, draft.trim())[locale];
  }

  return (
    <div className="mx-auto w-full max-w-[1680px] px-4 pt-6 pb-16 sm:px-6 xl:px-10">
      <div
        className={cn(
          'lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10',
          hasPreviewColumn &&
            'xl:grid-cols-[220px_minmax(0,1fr)_minmax(400px,460px)] 2xl:grid-cols-[240px_minmax(0,1fr)_540px]',
        )}
      >
        <aside className="hidden lg:block">
          <div className="sticky top-24 pt-[76px]">{status !== 'idle' && filterPanel}</div>
        </aside>

        <main className="min-w-0">
          <form
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              rememberSearch(draft);
            }}
          >
            <AppSearchBar
              onPage
              value={draft}
              onChange={(event) => search.setDraft(event.target.value)}
              onClear={() => search.setDraft('')}
              placeholder={searchPlaceholder[locale]}
              autoFocus={initialQuery === ''}
            />
          </form>

          {status !== 'idle' && (
            <>
              <div className="mt-5 flex items-center gap-3">
                <h1
                  aria-busy={status === 'loading'}
                  className="font-heading text-heading min-w-0 flex-1 text-[22px] leading-tight font-extrabold lg:text-[28px]"
                >
                  {heading}
                </h1>
                <Button
                  ref={filterButtonReference}
                  type="button"
                  variant="quiet"
                  size="touchIcon"
                  aria-label={filterLabel[locale]}
                  onClick={() => setIsFilterSheetOpen(true)}
                  className="relative lg:hidden"
                >
                  <SlidersHorizontal aria-hidden="true" />
                  {sheetFilterCount > 0 && (
                    <span className="bg-conveniat-green absolute -top-1 -right-1 rounded-full px-1.5 text-[11px] font-bold text-white">
                      {sheetFilterCount}
                    </span>
                  )}
                </Button>
              </div>

              <div className="mt-3 lg:hidden">
                <TypeChips
                  filters={filters}
                  counts={response?.counts}
                  locale={locale}
                  onChange={search.setFilters}
                />
              </div>
            </>
          )}

          {/* says the number of results once they are there, for those who cannot see the list */}
          <p className="sr-only" aria-live="polite">
            {status === 'ready' && response !== undefined
              ? resultCountLabel(response.total, draft.trim())[locale]
              : ''}
          </p>

          {renderResults()}
        </main>

        {hasPreviewColumn && (
          <aside className="hidden xl:block">
            {status === 'loading' && (
              <Card className="sticky top-24 mt-[76px] p-6">
                <PreviewSkeleton />
              </Card>
            )}
            {status === 'ready' && selected !== undefined && (
              <Card className="sticky top-24 mt-[76px] max-h-[calc(100dvh-7rem)] overflow-y-auto p-6">
                <SearchPreview
                  key={selected.key}
                  result={selected}
                  words={words}
                  locale={locale}
                  onClose={() => setIsPreviewClosed(true)}
                />
              </Card>
            )}
          </aside>
        )}
      </div>

      <BottomSheet
        open={isFilterSheetOpen}
        onOpenChange={setIsFilterSheetOpen}
        title={filterLabel[locale]}
        anchor={filterButtonReference}
        trailing={
          <SheetResetButton
            label={resetLabel[locale]}
            disabled={!hasFilters}
            onClick={() => search.setFilters(DEFAULT_FILTERS)}
          />
        }
        footer={
          <Button
            variant="primary"
            size="touch"
            className="w-full"
            onClick={() => setIsFilterSheetOpen(false)}
          >
            {showResultsLabel(response?.total ?? 0)[locale]}
          </Button>
        }
      >
        {filterPanel}
      </BottomSheet>
    </div>
  );
};
