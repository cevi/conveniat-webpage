'use client';

import { buttonVariants } from '@/components/ui/buttons/button';
import { LinkComponent } from '@/components/ui/link-component';
import { SectionLabel } from '@/components/ui/section-label';
import { HighlightedText } from '@/features/payload-cms/components/search/highlighted-text';
import { resultMetaParts } from '@/features/payload-cms/components/search/search-result-meta';
import { fileUrlOnPage } from '@/features/payload-cms/components/search/search-result-row';
import {
  closePreviewLabel,
  downloadLabel,
  linkedFromLabel,
  matchCountLabel,
  matchesLabel,
  openLabel,
  openOnPageLabel,
  pageShortLabel,
  pageThumbnailLabel,
  shownOnLabel,
  typeLabelSingular,
} from '@/features/payload-cms/components/search/search-translations';
import type {
  SearchDocumentDetails,
  SearchLinkedPage,
  SearchResult,
} from '@/features/payload-cms/search/search-types';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Download, ExternalLink, X } from 'lucide-react';
import React, { useState } from 'react';

const pageChipClassName =
  'bg-chip text-heading shrink-0 rounded-[5px] px-1.5 py-0.5 text-[11px] font-bold';

const PageLinks: React.FC<{ label: string; pages: SearchLinkedPage[] }> = ({ label, pages }) => (
  <p className="border-line mt-5 border-t pt-4 text-[13px] text-green-700">
    {label}{' '}
    {pages.map((page, index) => (
      <React.Fragment key={page.url}>
        {index > 0 && ', '}
        <LinkComponent href={page.url} className="text-conveniat-green font-semibold underline">
          {page.title}
        </LinkComponent>
      </React.Fragment>
    ))}
  </p>
);

/** The pages of the PDF in a row that snaps, the ones with a Fundstelle framed in green. */
const PageStrip: React.FC<{
  details: SearchDocumentDetails;
  selectedPage: number;
  onSelectPage: (page: number) => void;
  locale: Locale;
}> = ({ details, selectedPage, onSelectPage, locale }) => {
  if (details.thumbnails.length === 0) {
    if (details.thumbnailUrl === undefined) return;
    return (
      // eslint-disable-next-line @next/next/no-img-element -- a thumbnail Payload already sized
      <img
        src={details.thumbnailUrl}
        alt=""
        className="border-line w-36 rounded-lg border bg-white"
      />
    );
  }
  return (
    <div className="-mx-1 flex snap-x [scrollbar-width:none] gap-2 overflow-x-auto px-1 pt-1 pb-2">
      {details.thumbnails.map((thumbnail) => (
        <button
          key={thumbnail.page}
          type="button"
          onClick={() => onSelectPage(thumbnail.page)}
          aria-pressed={thumbnail.page === selectedPage}
          aria-label={pageThumbnailLabel(thumbnail.page, thumbnail.hasMatch)[locale]}
          className={cn(
            'relative w-[calc(25%-6px)] min-w-[88px] shrink-0 cursor-pointer snap-start overflow-hidden rounded-lg border bg-white',
            thumbnail.hasMatch ? 'border-conveniat-green' : 'border-line',
            thumbnail.page === selectedPage && 'ring-conveniat-green ring-2',
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- rendered once by the extractPdfPages task */}
          <img src={thumbnail.url} alt="" loading="lazy" className="block w-full" />
          <span className={cn(pageChipClassName, 'absolute bottom-1.5 left-1.5')}>
            {pageShortLabel(thumbnail.page)[locale]}
          </span>
        </button>
      ))}
    </div>
  );
};

const DocumentPreview: React.FC<{
  result: SearchResult;
  details: SearchDocumentDetails;
  words: string[];
  locale: Locale;
}> = ({ result, details, words, locale }) => {
  const [selectedPage, setSelectedPage] = useState(details.matches[0]?.page ?? 1);
  const canOpenOnPage = details.isPdf && details.matches.length > 0;

  return (
    <>
      <PageStrip
        details={details}
        selectedPage={selectedPage}
        onSelectPage={setSelectedPage}
        locale={locale}
      />

      {details.matches.length > 0 && (
        <>
          <SectionLabel as="h3" className="mt-4">
            {matchesLabel[locale]} · {details.matches.length}
          </SectionLabel>
          <ul className="mt-1 flex flex-col">
            {details.matches.map((match) => (
              <li key={match.page}>
                <button
                  type="button"
                  onClick={() => setSelectedPage(match.page)}
                  aria-pressed={match.page === selectedPage}
                  className={cn(
                    'flex min-h-11 w-full cursor-pointer items-start gap-2.5 rounded-lg px-2 py-2 text-left text-[14px] text-green-700',
                    match.page === selectedPage ? 'bg-tint' : 'hover:bg-quiet',
                  )}
                >
                  <span className={pageChipClassName}>{pageShortLabel(match.page)[locale]}</span>
                  <span>
                    <HighlightedText text={match.snippet} words={words} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={canOpenOnPage ? fileUrlOnPage(details.fileUrl, selectedPage) : details.fileUrl}
          target="_blank"
          rel="noopener"
          className={buttonVariants({ variant: 'primary', size: 'touch' })}
        >
          <ExternalLink aria-hidden="true" />
          {canOpenOnPage ? openOnPageLabel(selectedPage)[locale] : openLabel[locale]}
        </a>
        <a
          href={details.fileUrl}
          download
          className={buttonVariants({ variant: 'outlined', size: 'touch' })}
        >
          <Download aria-hidden="true" />
          {downloadLabel[locale]}
        </a>
      </div>

      {details.linkedFrom.length > 0 && (
        <PageLinks label={linkedFromLabel[locale]} pages={details.linkedFrom} />
      )}
      {details.matches.length === 0 && result.excerpt !== '' && (
        <p className="mt-3 text-[14px] text-green-700">{result.excerpt}</p>
      )}
    </>
  );
};

/**
 * Everything about one result beside the list: for a PDF its pages, where the words stand on
 * them, and the pages that link to it; for a page or a news entry its passage and the way there.
 */
export const SearchPreview: React.FC<{
  result: SearchResult;
  words: string[];
  locale: Locale;
  /** given where the preview can be closed to widen the list */
  onClose?: () => void;
  className?: string;
}> = ({ result, words, locale, onClose, className }) => {
  const details = result.document;
  const meta = [
    ...resultMetaParts(result, locale).slice(details === undefined ? 0 : 1),
    ...(details === undefined || details.matches.length === 0
      ? []
      : [matchCountLabel(details.matches.length)[locale]]),
  ];
  const label = details?.typeLabel ?? typeLabelSingular[result.type][locale];

  return (
    <article className={className}>
      <div className="flex items-start gap-3">
        <p className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-green-500">
          <span className="bg-chip text-heading rounded-[5px] px-1.5 py-0.5 text-[11px] font-bold tracking-wide uppercase">
            {label}
          </span>
          {result.type === 'page' ? undefined : meta.join(' · ')}
        </p>
        {onClose !== undefined && (
          <button
            type="button"
            onClick={onClose}
            aria-label={closePreviewLabel[locale]}
            className={buttonVariants({ variant: 'quiet', size: 'touchIcon' })}
          >
            <X aria-hidden="true" />
          </button>
        )}
      </div>

      <h2 className="font-heading text-heading mt-2 mb-4 text-[24px] leading-tight font-extrabold">
        <HighlightedText text={result.title} words={words} />
      </h2>

      {details === undefined ? (
        <>
          {result.excerpt !== '' && (
            <p className="text-[15px] leading-relaxed text-green-700">
              <HighlightedText text={result.excerpt} words={words} />
            </p>
          )}
          <div className="mt-4">
            <LinkComponent
              href={result.url}
              className={buttonVariants({ variant: 'primary', size: 'touch' })}
            >
              {openLabel[locale]}
            </LinkComponent>
          </div>
          {result.shownOn !== undefined && (
            <PageLinks label={shownOnLabel[locale]} pages={[result.shownOn]} />
          )}
        </>
      ) : (
        <DocumentPreview result={result} details={details} words={words} locale={locale} />
      )}
    </article>
  );
};
