'use client';

import { buttonVariants } from '@/components/ui/buttons/button';
import { Card } from '@/components/ui/card';
import { LinkComponent } from '@/components/ui/link-component';
import { SectionLabel } from '@/components/ui/section-label';
import { DocumentDownloadRow } from '@/features/payload-cms/components/content-blocks/file-download';
import { HighlightedText } from '@/features/payload-cms/components/search/highlighted-text';
import { resultMetaParts } from '@/features/payload-cms/components/search/search-result-meta';
import { fileUrlOnPage } from '@/features/payload-cms/components/search/search-result-row';
import {
  closePreviewLabel,
  linkedFromLabel,
  matchCountLabel,
  matchesLabel,
  openLabel,
  pageCountLabel,
  pageShortLabel,
  shownOnLabel,
  typeLabelSingular,
} from '@/features/payload-cms/components/search/search-translations';
import type {
  SearchDocumentDetails,
  SearchLinkedPage,
  SearchResult,
} from '@/features/payload-cms/search/search-types';
import type { Locale } from '@/types/types';
import { X } from 'lucide-react';
import React from 'react';

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

/**
 * The document as every download list shows it, then where the words stand in it, each Fundstelle
 * a link to its page.
 */
const DocumentPreview: React.FC<{
  result: SearchResult;
  details: SearchDocumentDetails;
  words: string[];
  locale: Locale;
}> = ({ result, details, words, locale }) => (
  <>
    <Card as="ul">
      <DocumentDownloadRow
        href={details.fileUrl}
        displayName={result.title}
        filename={details.filename}
        mimeType={details.mimeType}
        thumbnailUrl={details.thumbnailUrl}
        filesize={details.filesize}
        updatedAt={details.updatedAt}
        openInNewTab
        locale={locale}
      />
    </Card>

    {details.matches.length > 0 && (
      <>
        <SectionLabel as="h3" className="mt-5">
          {matchesLabel[locale]} · {details.matches.length}
        </SectionLabel>
        <ul className="mt-1 flex flex-col">
          {details.matches.map((match) => (
            <li key={match.page}>
              <a
                href={details.isPdf ? fileUrlOnPage(details.fileUrl, match.page) : details.fileUrl}
                target="_blank"
                rel="noopener"
                className="hover:bg-quiet flex min-h-11 items-start gap-2.5 rounded-lg px-2 py-2 text-[14px] text-green-700"
              >
                <span className={pageChipClassName}>{pageShortLabel(match.page)[locale]}</span>
                <span>
                  <HighlightedText text={match.snippet} words={words} />
                </span>
              </a>
            </li>
          ))}
        </ul>
      </>
    )}

    {details.linkedFrom.length > 0 && (
      <PageLinks label={linkedFromLabel[locale]} pages={details.linkedFrom} />
    )}
  </>
);

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
  // a document's type, size and date are in its download row below
  const meta =
    details === undefined
      ? resultMetaParts(result, locale)
      : [
          details.pageCount === undefined ? undefined : pageCountLabel(details.pageCount)[locale],
          details.matches.length === 0
            ? undefined
            : matchCountLabel(details.matches.length)[locale],
        ].filter((part): part is string => part !== undefined);
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
