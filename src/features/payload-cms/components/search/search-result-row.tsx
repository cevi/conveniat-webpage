'use client';

import { LinkComponent } from '@/components/ui/link-component';
import { HighlightedText } from '@/features/payload-cms/components/search/highlighted-text';
import {
  resultMetaParts,
  resultTypeIcons,
} from '@/features/payload-cms/components/search/search-result-meta';
import {
  moreMatchesLabel,
  pageShortLabel,
} from '@/features/payload-cms/components/search/search-translations';
import type { SearchResult } from '@/features/payload-cms/search/search-types';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import type React from 'react';
import { useState } from 'react';

/** Below `xl` there is no preview, so a document row lists its first Fundstellen itself. */
const INLINE_MATCH_COUNT = 2;

/** The page of a PDF to open: its viewer jumps there from the fragment. */
export const fileUrlOnPage = (fileUrl: string, page: number): string => `${fileUrl}#page=${page}`;

const hasInlineMatches = (result: SearchResult): boolean =>
  (result.document?.matches.length ?? 0) > 0;

const ResultIcon: React.FC<{ result: SearchResult; isSelected: boolean }> = ({
  result,
  isSelected,
}) => {
  const thumbnail = result.document?.thumbnailUrl;
  if (thumbnail !== undefined) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- a 40px thumbnail Payload already sized
      <img
        src={thumbnail}
        alt=""
        loading="lazy"
        className="border-line h-[54px] w-10 shrink-0 rounded-md border bg-white object-cover object-top"
      />
    );
  }
  const Icon = resultTypeIcons[result.type];
  return (
    <span
      className={cn(
        'flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px]',
        isSelected ? 'text-conveniat-green bg-white' : 'bg-tint text-conveniat-green',
      )}
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
    </span>
  );
};

const RowBody: React.FC<{
  result: SearchResult;
  words: string[];
  locale: Locale;
  isSelected: boolean;
}> = ({ result, words, locale, isSelected }) => (
  <>
    <ResultIcon result={result} isSelected={isSelected} />
    <span className="flex min-w-0 flex-1 flex-col">
      <span className="font-heading text-heading text-[16px] leading-snug font-bold">
        <HighlightedText text={result.title} words={words} />
      </span>
      <span className="mt-0.5 truncate text-[13px] text-green-500">
        {resultMetaParts(result, locale).join(' · ')}
      </span>
      {result.excerpt !== '' && (
        <span
          className={cn(
            'mt-1 line-clamp-2 text-[14px] leading-normal text-green-700',
            // below xl a document lists its Fundstellen under the row, the first one included
            hasInlineMatches(result) && 'max-xl:hidden',
          )}
        >
          <HighlightedText text={result.excerpt} words={words} />
        </span>
      )}
    </span>
  </>
);

/** The first Fundstellen of a document, each a link to its page, where no preview shows them. */
const InlineMatches: React.FC<{ result: SearchResult; words: string[]; locale: Locale }> = ({
  result,
  words,
  locale,
}) => {
  const details = result.document;
  if (details === undefined || !hasInlineMatches(result)) return;
  const shown = details.matches.slice(0, INLINE_MATCH_COUNT);
  const remaining = details.matches.length - shown.length;
  return (
    <ul className="ml-[54px] flex flex-col pb-2 xl:hidden">
      {shown.map((match) => (
        <li key={match.page}>
          <a
            href={details.isPdf ? fileUrlOnPage(details.fileUrl, match.page) : details.fileUrl}
            target="_blank"
            rel="noopener"
            className="flex min-h-11 items-center gap-2 text-[13px] text-green-700"
          >
            <span className="bg-chip text-heading shrink-0 rounded-[5px] px-1.5 py-0.5 text-[11px] font-bold">
              {pageShortLabel(match.page)[locale]}
            </span>
            <span className="line-clamp-1">
              <HighlightedText text={match.snippet} words={words} />
            </span>
          </a>
        </li>
      ))}
      {remaining > 0 && (
        <li className="text-conveniat-green text-[13px] font-semibold">
          {moreMatchesLabel(remaining)[locale]}
        </li>
      )}
    </ul>
  );
};

/**
 * One result in the list. Below `xl` it is a link to the result. From `xl` on a press chooses it
 * for the preview beside the list instead, which holds the links.
 */
export const SearchResultRow: React.FC<{
  result: SearchResult;
  words: string[];
  locale: Locale;
  isSelected: boolean;
  /** given on a desktop, where the preview shows the chosen result */
  onSelect: ((result: SearchResult) => void) | undefined;
  /** called when the row opens its result */
  onOpen: () => void;
}> = ({ result, words, locale, isSelected, onSelect, onOpen }) => {
  // a visible row prefetches the page up to its loading state; one the visitor points at, in
  // full, so it opens without a spinner. Every row in full would be a server render each.
  const [hasIntent, setHasIntent] = useState(false);
  const showIntent = (): void => setHasIntent(true);
  const rowClassName = cn(
    'relative flex w-full cursor-pointer items-start gap-4 px-4 py-4 text-left transition-colors sm:px-5',
    isSelected
      ? 'bg-tint before:bg-conveniat-green before:absolute before:inset-y-0 before:left-0 before:w-[3px]'
      : 'hover:bg-quiet',
  );
  const body = <RowBody result={result} words={words} locale={locale} isSelected={isSelected} />;

  if (onSelect !== undefined) {
    return (
      <li>
        <button
          type="button"
          aria-pressed={isSelected}
          onClick={() => onSelect(result)}
          className={rowClassName}
        >
          {body}
        </button>
      </li>
    );
  }

  return (
    <li className="pb-1">
      {result.type === 'document' ? (
        <a
          href={result.url}
          target="_blank"
          rel="noopener"
          onClick={onOpen}
          className={cn(rowClassName, hasInlineMatches(result) && 'pb-1')}
        >
          {body}
        </a>
      ) : (
        <LinkComponent
          href={result.url}
          prefetch={hasIntent ? true : 'auto'}
          onMouseEnter={showIntent}
          onFocus={showIntent}
          onTouchStart={showIntent}
          onClick={onOpen}
          className={rowClassName}
        >
          {body}
        </LinkComponent>
      )}
      <div className="px-4 sm:px-5">
        <InlineMatches result={result} words={words} locale={locale} />
      </div>
    </li>
  );
};
