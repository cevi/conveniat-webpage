'use client';

import { Button } from '@/components/ui/buttons/button';
import { Card } from '@/components/ui/card';
import { IconTile } from '@/components/ui/icon-tile';
import type { TitledPoint } from '@/features/image-submission/api/image-submission-texts';
import { TermsText } from '@/features/image-submission/terms-text';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Check, ChevronDown } from 'lucide-react';
import type React from 'react';
import { useId, useState } from 'react';

const heading: StaticTranslationString = {
  de: 'Bevor du loslegst',
  en: 'Before you start',
  fr: 'Avant de commencer',
};

const readFullTerms: StaticTranslationString = {
  de: 'Vollständige Bedingungen lesen',
  en: 'Read the full terms',
  fr: 'Lire les conditions complètes',
};

const agreeLabel: StaticTranslationString = {
  de: 'Ich habe die Bedingungen gelesen und bin einverstanden.',
  en: 'I have read the terms and agree to them.',
  fr: "J'ai lu les conditions et je les accepte.",
};

const chooseImages: StaticTranslationString = {
  de: 'Bilder auswählen',
  en: 'Choose images',
  fr: 'Choisir des images',
};

/**
 * The terms, agreed to before anyone chooses an image or writes a description, so nobody
 * learns of them after the work is done.
 */
export const TermsStep: React.FC<{
  lead: string;
  summary: TitledPoint[];
  fullText: string;
  onAgree: () => void;
}> = ({ lead, summary, fullText, onAgree }) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const [agreed, setAgreed] = useState(false);
  // without a summary, the full text is all there is to read
  const [showFullText, setShowFullText] = useState(summary.length === 0);
  const fullTextId = useId();
  const checkboxId = useId();

  return (
    <div className="space-y-5">
      <h2 className="font-heading text-heading text-[28px] leading-tight font-extrabold">
        {heading[locale]}
      </h2>
      {lead !== '' && <p className="text-[15px] leading-normal text-green-700">{lead}</p>}

      {summary.length > 0 && (
        <Card as="ul" divided>
          {summary.map((point, index) => (
            <li key={index} className="flex items-start gap-3 px-4 py-3">
              <IconTile icon={Check} />
              <span className="min-w-0">
                <span className="block text-[15px] font-semibold text-green-900">
                  {point.title}
                </span>
                {point.text !== '' && (
                  <span className="block text-[13px] leading-normal text-green-700">
                    {point.text}
                  </span>
                )}
              </span>
            </li>
          ))}
        </Card>
      )}

      <div>
        {summary.length > 0 && (
          <button
            type="button"
            aria-expanded={showFullText}
            aria-controls={fullTextId}
            onClick={() => setShowFullText((shown) => !shown)}
            className="focus-visible:focus-surface flex min-h-11 w-full cursor-pointer items-center justify-between gap-2 rounded-xl text-left text-[15px] font-semibold text-green-900 underline underline-offset-2"
          >
            {readFullTerms[locale]}
            <ChevronDown
              aria-hidden="true"
              className={cn('h-5 w-5 shrink-0 transition-transform', showFullText && 'rotate-180')}
            />
          </button>
        )}
        {showFullText && (
          <div id={fullTextId} className="bg-quiet mt-2 rounded-[14px] p-4">
            <TermsText text={fullText} />
          </div>
        )}
      </div>

      <label
        htmlFor={checkboxId}
        className={cn(
          'hover:bg-quiet flex cursor-pointer items-start gap-3 rounded-[14px] border bg-white p-3.5 transition-colors',
          agreed ? 'border-conveniat-green' : 'border-line',
        )}
      >
        <span className="flex h-6 items-center">
          <input
            id={checkboxId}
            type="checkbox"
            checked={agreed}
            onChange={(event) => setAgreed(event.target.checked)}
            className="accent-conveniat-green h-5 w-5 cursor-pointer"
          />
        </span>
        <span className="text-[15px] text-green-900 select-none">{agreeLabel[locale]}</span>
      </label>

      <Button
        variant="primary"
        size="touch"
        className="w-full"
        disabled={!agreed}
        onClick={onAgree}
      >
        {chooseImages[locale]}
      </Button>
    </div>
  );
};
