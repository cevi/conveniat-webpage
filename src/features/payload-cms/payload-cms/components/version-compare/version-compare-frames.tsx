'use client';

import { resolveAdminLocale } from '@/features/payload-cms/payload-cms/components/shared/resolve-admin-locale';
import { useVersionComparison } from '@/features/payload-cms/payload-cms/components/version-compare/use-version-comparison';
import type { StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import type { ReactSelectOption } from '@payloadcms/ui';
import { CheckboxInput, ReactSelect, useTranslation } from '@payloadcms/ui';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type React from 'react';
import { useCallback, useRef, useState } from 'react';

const compareWithLabel: StaticTranslationString = {
  de: 'Im Vergleich zu',
  en: 'Compared with',
  fr: 'Comparé à',
};

const thisVersionLabel: StaticTranslationString = {
  de: 'Diese Version',
  en: 'This version',
  fr: 'Cette version',
};

const highlightLabel: StaticTranslationString = {
  de: 'Änderungen hervorheben',
  en: 'Highlight changes',
  fr: 'Surligner les modifications',
};

const blocksLabel: StaticTranslationString = { de: 'Blöcke', en: 'Blocks', fr: 'Blocs' };

// Label first and count after it, so no language has to agree the word with the number.
const removedLabel: StaticTranslationString = { de: 'Entfernt', en: 'Removed', fr: 'Supprimé' };
const addedLabel: StaticTranslationString = { de: 'Neu', en: 'Added', fr: 'Ajouté' };
const changedLabel: StaticTranslationString = { de: 'Geändert', en: 'Changed', fr: 'Modifié' };

const noDifferencesLabel: StaticTranslationString = {
  de: 'Keine sichtbaren Unterschiede in dieser Sprache.',
  en: 'No visible differences in this language.',
  fr: 'Aucune différence visible dans cette langue.',
};

const nothingToCompareLabel: StaticTranslationString = {
  de: 'Es gibt keine frühere Version zum Vergleichen.',
  en: 'There is no earlier version to compare with.',
  fr: "Il n'y a pas de version antérieure à comparer.",
};

/** One side of the comparison: a version and the page that renders it. */
export interface VersionComparePane {
  id: string;
  label: string;
  url: string;
}

const paneHeaderClassName =
  'flex h-16 items-center gap-3 border-0 border-b border-solid border-(--theme-elevation-150) px-4';

const frameClassName = 'block h-[calc(100vh-270px)] min-h-[420px] w-full border-0 bg-white';

const LegendEntry: React.FC<{ swatchClassName: string; count: number; label: string }> = ({
  swatchClassName,
  count,
  label,
}) => (
  <span className="flex items-center gap-2">
    <span className={cn('inline-block size-3 rounded-full', swatchClassName)} />
    {label}: {count}
  </span>
);

/**
 * Two versions of a page, each rendered by the public site in its own frame, with the
 * differences marked and both frames scrolling as one.
 */
export const VersionCompareFrames: React.FC<{
  before: VersionComparePane | undefined;
  after: VersionComparePane;
  /** The versions `after` can be compared with. */
  options: { label: string; value: string }[];
}> = ({ before, after, options }) => {
  const { i18n } = useTranslation();
  const locale = resolveAdminLocale(i18n.language);

  const router = useRouter();
  const pathname = usePathname();
  const searchParameters = useSearchParams();

  const beforeFrame = useRef<HTMLIFrameElement>(null);
  const afterFrame = useRef<HTMLIFrameElement>(null);
  const [highlight, setHighlight] = useState(true);
  const { summary, onFrameLoad } = useVersionComparison({ beforeFrame, afterFrame, highlight });

  const compareWith = useCallback(
    (selected: ReactSelectOption | ReactSelectOption[]) => {
      const option = Array.isArray(selected) ? selected[0] : selected;
      if (typeof option?.value !== 'string') return;

      const parameters = new URLSearchParams(searchParameters.toString());
      parameters.set('versionFrom', option.value);
      router.push(`${pathname}?${parameters.toString()}`);
    },
    [pathname, router, searchParameters],
  );

  const selected = options.find((option) => option.value === before?.id);
  const hasDifferences =
    summary !== undefined && summary.removed + summary.added + summary.changed > 0;

  return (
    <>
      <div className="flex min-h-12 flex-wrap items-center gap-x-8 gap-y-2 px-(--gutter-h) py-2">
        <CheckboxInput
          id="version-compare-highlight"
          checked={highlight}
          label={highlightLabel[locale]}
          onToggle={(event) => setHighlight(event.target.checked)}
        />
        {hasDifferences && (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-(--theme-elevation-800)">
            <span className="text-(--theme-elevation-500)">{blocksLabel[locale]}</span>
            <LegendEntry
              swatchClassName="bg-(--theme-error-500)"
              count={summary.removed}
              label={removedLabel[locale]}
            />
            <LegendEntry
              swatchClassName="bg-(--theme-success-500)"
              count={summary.added}
              label={addedLabel[locale]}
            />
            <LegendEntry
              swatchClassName="bg-(--theme-elevation-400)"
              count={summary.changed}
              label={changedLabel[locale]}
            />
          </div>
        )}
        {summary !== undefined && !hasDifferences && (
          <span className="text-(--theme-elevation-500)">{noDifferencesLabel[locale]}</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-px border-0 border-y border-solid border-(--theme-elevation-150) bg-(--theme-elevation-150)">
        <div className="min-w-0 bg-(--theme-bg)">
          <div className={paneHeaderClassName}>
            <span className="shrink-0 text-(--theme-elevation-500)">
              {compareWithLabel[locale]}
            </span>
            <div className="min-w-0 flex-1">
              <ReactSelect
                isClearable={false}
                isSearchable={false}
                onChange={compareWith}
                options={options}
                {...(selected === undefined ? {} : { value: selected })}
              />
            </div>
          </div>
          {before === undefined ? (
            <div className={cn(frameClassName, 'p-4 text-(--theme-elevation-500)')}>
              {nothingToCompareLabel[locale]}
            </div>
          ) : (
            <iframe
              // a different version is a different page, not a navigation of this one
              key={before.id}
              ref={beforeFrame}
              className={frameClassName}
              onLoad={onFrameLoad}
              src={before.url}
              title={`${compareWithLabel[locale]}: ${before.label}`}
            />
          )}
        </div>

        <div className="min-w-0 bg-(--theme-bg)">
          <div className={paneHeaderClassName}>
            <span className="shrink-0 text-(--theme-elevation-500)">
              {thisVersionLabel[locale]}
            </span>
            <span className="truncate font-medium text-(--theme-elevation-800)">{after.label}</span>
          </div>
          <iframe
            key={after.id}
            ref={afterFrame}
            className={frameClassName}
            onLoad={onFrameLoad}
            src={after.url}
            title={`${thisVersionLabel[locale]}: ${after.label}`}
          />
        </div>
      </div>
    </>
  );
};
