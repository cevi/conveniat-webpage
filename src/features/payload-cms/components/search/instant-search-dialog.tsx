'use client';
import { AppSearchBar } from '@/components/ui/app-search-bar';
import { HighlightedText } from '@/features/payload-cms/components/search/highlighted-text';
import { rememberSearch } from '@/features/payload-cms/components/search/recent-searches';
import { filterChipClassName } from '@/features/payload-cms/components/search/search-filter-panel';
import { SearchPreview } from '@/features/payload-cms/components/search/search-preview';
import {
  resultMetaParts,
  resultTypeIcons,
} from '@/features/payload-cms/components/search/search-result-meta';
import {
  InstantRowsSkeleton,
  PreviewSkeleton,
} from '@/features/payload-cms/components/search/search-skeleton';
import { RecentSearches } from '@/features/payload-cms/components/search/search-suggestions';
import {
  allTypesLabel,
  fullViewLabel,
  instantCloseKeyLabel,
  instantErrorLabel,
  instantHintLabel,
  instantNavigateKeyLabel,
  instantOfflineLabel,
  instantOpenKeyLabel,
  noResultsDescription,
  noResultsTitle,
  searchPlaceholder,
  typeLabels,
} from '@/features/payload-cms/components/search/search-translations';
import {
  MIN_QUERY_LENGTH,
  QUERY_DELAY_MS,
} from '@/features/payload-cms/components/search/use-live-search';
import { isSearchShortcut } from '@/features/payload-cms/components/search/use-search-shortcut';
import { parseSearchWords } from '@/features/payload-cms/search/search-text';
import type { SearchResult, SearchResultType } from '@/features/payload-cms/search/search-types';
import {
  buildSearchQueryString,
  SEARCH_RESULT_TYPES,
} from '@/features/payload-cms/search/search-types';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useTRPC } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { ChevronRight, CornerDownLeft, SearchX, WifiOff } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { useRef, useState } from 'react';

import { useQuery } from '@tanstack/react-query';

const Key: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <kbd className="border-line text-heading rounded-[5px] border bg-white px-1.5 py-0.5 font-sans text-[11px] font-semibold">
    {children}
  </kbd>
);

/**
 * The results in the order the list shows them: grouped by type, the group of the best result
 * first, best first in each group.
 */
const groupByType = (results: SearchResult[]): [SearchResultType, SearchResult[]][] => {
  const types = [...new Set(results.map((result) => result.type))];
  return types.map((type) => [type, results.filter((result) => result.type === type)]);
};

const InstantResultRow: React.FC<{
  result: SearchResult;
  words: string[];
  locale: Locale;
  isSelected: boolean;
  onHover: () => void;
  onOpen: () => void;
  rowReference: (element: HTMLAnchorElement | null) => void;
}> = ({ result, words, locale, isSelected, onHover, onOpen, rowReference }) => {
  const Icon = resultTypeIcons[result.type];
  const isDocument = result.type === 'document';
  return (
    <Link
      ref={rowReference}
      href={result.url}
      role="option"
      aria-selected={isSelected}
      // the chosen page is prefetched in full, so opening it shows the page and not its loading
      // state; only the chosen one, not a server render for every result of every keystroke
      prefetch={!isDocument && isSelected}
      {...(isDocument ? { target: '_blank', rel: 'noopener' } : {})}
      onMouseMove={onHover}
      onClick={onOpen}
      className={cn(
        'flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-[10px] px-3 py-2.5 text-left',
        isSelected ? 'bg-conveniat-green text-white' : 'bg-quiet text-heading',
      )}
    >
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px]',
          isSelected ? 'bg-white/15 text-white' : 'text-conveniat-green bg-white',
        )}
      >
        <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[15px] font-bold">
          <HighlightedText text={result.title} words={words} onDark={isSelected} />
        </span>
        <span
          className={cn('truncate text-[13px]', isSelected ? 'text-white/80' : 'text-green-500')}
        >
          {resultMetaParts(result, locale).join(' · ')}
        </span>
      </span>
      {isSelected && <CornerDownLeft className="h-4 w-4 shrink-0" aria-hidden="true" />}
    </Link>
  );
};

const Notice: React.FC<{ icon: React.ReactNode; title: string; description?: string }> = ({
  icon,
  title,
  description,
}) => (
  <div className="flex flex-col items-center px-6 py-12 text-center">
    {icon}
    <p className="text-heading mt-3 text-[15px] font-semibold">{title}</p>
    {description !== undefined && <p className="mt-1 text-[14px] text-green-700">{description}</p>}
  </div>
);

/**
 * The search a desktop opens from the header or with Ctrl K: results while typing, grouped by
 * type, the chosen one previewed beside them, and the way to the full search page. Phones go to
 * the search page directly; this would only cover their screen.
 */
export const InstantSearchDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  locale: Locale;
  /** the search page, with the locale prefix */
  searchPath: string;
}> = ({ open, onClose, locale, searchPath }) => {
  const trpc = useTRPC();
  const router = useRouter();
  const isOnline = useOnlineStatus();
  const [query, setQuery] = useState('');
  const [types, setTypes] = useState<SearchResultType[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | undefined>();
  const rowReferences = useRef<(HTMLAnchorElement | null)[]>([]);

  const trimmed = query.trim();
  const debouncedQuery = useDebouncedValue(trimmed, QUERY_DELAY_MS);
  const isTyping = trimmed !== debouncedQuery;
  const isSearchable = debouncedQuery.length >= MIN_QUERY_LENGTH;
  const searchQuery = useQuery(
    trpc.search.getSearchResultList.queryOptions(
      { locale, query: debouncedQuery, types },
      {
        enabled: open && isSearchable && isOnline,
        staleTime: 60_000,
        // a search is asked once and forgotten; it has no place in the cache kept offline
        meta: { persist: false },
      },
    ),
  );

  // the answer for exactly what is typed: from the first keystroke on, the rows of the query
  // before would be wrong, so they give way to skeletons until the new answer is there
  const data = isTyping || !isSearchable ? undefined : searchQuery.data;
  const words = parseSearchWords(debouncedQuery);
  const groups = isSearchable && data !== undefined ? groupByType(data.results) : [];
  const ordered = groups.flatMap(([, group]) => group);
  // a new list starts at its best result, unless the chosen one is still in it
  const selected = ordered.find((result) => result.key === selectedKey) ?? ordered[0];
  const selectedIndex = selected === undefined ? -1 : ordered.indexOf(selected);
  const totalFound =
    data === undefined ? 0 : SEARCH_RESULT_TYPES.reduce((sum, type) => sum + data.counts[type], 0);

  const fullViewHref = `${searchPath}?${buildSearchQueryString({ query: query.trim(), types })}`;

  const close = (): void => {
    onClose();
    setQuery('');
    setTypes([]);
  };

  const openResult = (chosen: SearchResult): void => {
    rememberSearch(trimmed);
    if (chosen.type === 'document') {
      globalThis.open(chosen.url, '_blank', 'noopener');
    } else {
      router.push(chosen.url);
    }
    close();
  };

  const openFullView = (): void => {
    if (trimmed === '') return;
    rememberSearch(trimmed);
    router.push(fullViewHref);
    close();
  };

  const moveSelection = (step: number): void => {
    if (ordered.length === 0) return;
    const next = (selectedIndex + step + ordered.length) % ordered.length;
    setSelectedKey(ordered[next]?.key);
    rowReferences.current[next]?.scrollIntoView({ block: 'nearest' });
  };

  const handleKeyDown = (event: React.KeyboardEvent): void => {
    if (isSearchShortcut(event.nativeEvent)) {
      // the shortcut that opened the search closes it again, through `close` like Esc; stopped
      // here, before the page-wide listener that opens it would reopen it
      event.preventDefault();
      event.stopPropagation();
      if (!event.repeat) close();
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      moveSelection(event.key === 'ArrowDown' ? 1 : -1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (event.ctrlKey || event.metaKey) openFullView();
      else if (selected === undefined) openFullView();
      else openResult(selected);
    }
  };

  const toggleType = (type: SearchResultType): void =>
    setTypes((chosen) =>
      chosen.includes(type) ? chosen.filter((entry) => entry !== type) : [...chosen, type],
    );

  const renderBody = (): React.ReactNode => {
    if (!isOnline) {
      return (
        <Notice
          icon={<WifiOff className="h-7 w-7 text-green-500" aria-hidden="true" />}
          title={instantOfflineLabel[locale]}
        />
      );
    }
    if (trimmed.length < MIN_QUERY_LENGTH) {
      return (
        <div className="px-5 py-6">
          <p className="text-[15px] text-green-700">{instantHintLabel[locale]}</p>
          <RecentSearches locale={locale} onPick={setQuery} className="mt-5" />
        </div>
      );
    }
    if (!isTyping && searchQuery.isError && data === undefined) {
      return (
        <Notice
          icon={<SearchX className="h-7 w-7 text-green-500" aria-hidden="true" />}
          title={instantErrorLabel[locale]}
        />
      );
    }
    if (data === undefined) {
      return (
        <div
          aria-busy="true"
          className="grid min-h-0 flex-1 grid-cols-[minmax(0,420px)_minmax(0,1fr)]"
        >
          <InstantRowsSkeleton />
          <div className="border-line bg-page border-l px-6 py-5">
            <PreviewSkeleton />
          </div>
        </div>
      );
    }
    if (ordered.length === 0) {
      return (
        <>
          <Notice
            icon={<SearchX className="h-7 w-7 text-green-500" aria-hidden="true" />}
            title={noResultsTitle[locale]}
            description={noResultsDescription[locale]}
          />
          <RecentSearches
            locale={locale}
            current={trimmed}
            onPick={setQuery}
            className="px-5 pb-6"
          />
        </>
      );
    }
    let index = -1;
    return (
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <div role="listbox" className="overflow-y-auto px-3 py-3">
          {groups.map(([type, group]) => (
            <section key={type} className="mb-3">
              <h3 className="px-1 pb-1.5 text-xs font-bold tracking-[0.08em] text-green-700 uppercase">
                {typeLabels[type][locale]}
              </h3>
              <div className="flex flex-col gap-1.5">
                {group.map((result) => {
                  index += 1;
                  const rowIndex = index;
                  return (
                    <InstantResultRow
                      key={result.key}
                      result={result}
                      words={words}
                      locale={locale}
                      isSelected={result.key === selected?.key}
                      onHover={() => setSelectedKey(result.key)}
                      onOpen={() => {
                        rememberSearch(trimmed);
                        close();
                      }}
                      rowReference={(element) => {
                        rowReferences.current[rowIndex] = element;
                      }}
                    />
                  );
                })}
              </div>
            </section>
          ))}
        </div>
        {/* every link in the preview leaves the search, like a result row does; the links are
            the preview's own, so they are caught here rather than handed a callback each */}
        <div
          onClick={(event) => {
            if (event.target instanceof Element && event.target.closest('a') !== null) {
              rememberSearch(trimmed);
              close();
            }
          }}
          className="border-line bg-page overflow-y-auto border-l px-6 py-5"
        >
          {selected !== undefined && (
            <SearchPreview key={selected.key} result={selected} words={words} locale={locale} />
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onClose={close} className="relative z-[100]">
      <DialogBackdrop className="fixed inset-0 bg-gray-950/30" />
      <div className="fixed inset-0 flex justify-center px-8 pt-[8vh]">
        <DialogPanel
          onKeyDown={handleKeyDown}
          className="flex h-fit max-h-[84vh] w-full max-w-[1080px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        >
          <DialogTitle className="sr-only">{searchPlaceholder[locale]}</DialogTitle>
          <div className="border-line border-b px-4 pt-4 pb-3">
            <div className="flex items-center gap-3">
              <AppSearchBar
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onClear={() => setQuery('')}
                placeholder={searchPlaceholder[locale]}
                autoFocus
                className="flex-1"
              />
              <Key>Esc</Key>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                aria-pressed={types.length === 0}
                onClick={() => setTypes([])}
                className={filterChipClassName(types.length === 0)}
              >
                {allTypesLabel[locale]}
                {data !== undefined && isSearchable && (
                  <span className="text-[12px] opacity-75">{totalFound}</span>
                )}
              </button>
              {SEARCH_RESULT_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  aria-pressed={types.includes(type)}
                  onClick={() => toggleType(type)}
                  className={filterChipClassName(types.includes(type))}
                >
                  {typeLabels[type][locale]}
                  {data !== undefined && isSearchable && (
                    <span className="text-[12px] opacity-75">{data.counts[type]}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {renderBody()}

          <div className="border-line bg-page flex items-center gap-2 border-t px-4 py-2.5 text-[13px] text-green-700">
            <Key>↵</Key> {instantOpenKeyLabel[locale]}
            <Key>↑</Key>
            <Key>↓</Key> {instantNavigateKeyLabel[locale]}
            <Key>Esc</Key> {instantCloseKeyLabel[locale]}
            {data !== undefined && isSearchable && data.total > 0 && (
              <button
                type="button"
                onClick={openFullView}
                className="text-conveniat-green ml-auto flex min-h-11 cursor-pointer items-center gap-1.5 font-semibold"
              >
                {fullViewLabel(data.total)[locale]}
                <Key>Ctrl ↵</Key>
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
};
