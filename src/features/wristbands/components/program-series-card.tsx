'use client';

import { Card } from '@/components/ui/card';
import { SectionLabel } from '@/components/ui/section-label';
import { ScanStatus } from '@/features/wristbands/components/scan-status';
import type { ScanNotice, ScanPhase } from '@/features/wristbands/hooks/use-band-scanner';
import type { SeriesBand } from '@/features/wristbands/series';
import { translate } from '@/features/wristbands/texts';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Check, CircleAlert, RotateCcw } from 'lucide-react';
import type React from 'react';

/** How many of the last bands the list shows. */
const SHOWN = 8;

const stateOf = (band: SeriesBand, locale: Locale): React.ReactNode => {
  if (band.state === 'done') {
    return (
      <span className="text-conveniat-green flex items-center gap-1 text-[13px] font-semibold">
        <Check className="size-4" aria-hidden />
        {translate('bandDone', locale)}
      </span>
    );
  }
  const refused = band.state === 'refused';
  const Icon = refused ? CircleAlert : RotateCcw;
  return (
    <span
      className={cn(
        'flex items-center gap-1 text-[13px] font-semibold',
        refused ? 'text-danger-text' : 'text-green-700',
      )}
    >
      <Icon className="size-4" aria-hidden />
      {translate(refused ? 'bandRefused' : 'bandAgain', locale)}
    </span>
  );
};

/**
 * "Nur programmieren", before the camp: bands held one after the other become spare bands of
 * the Hof, without anybody's name. A counter, the scanner, and the last bands by their running
 * number: "Band 23 ✓", "Band 24 · Nochmals anhalten".
 */
export const ProgramSeriesCard: React.FC<{
  bands: SeriesBand[];
  locale: Locale;
  phase: ScanPhase;
  notice: ScanNotice | undefined;
  onResume: () => void;
}> = ({ bands, locale, phase, notice, onResume }) => {
  const done = bands.filter((band) => band.state === 'done').length;
  const recent = bands.toReversed().slice(0, SHOWN);
  return (
    <div className="space-y-6">
      <Card as="section" className="space-y-4 p-4">
        <div>
          <h2 className="font-heading text-heading text-[28px] leading-tight font-extrabold tabular-nums">
            {done === 1
              ? translate('programmedCountOne', locale)
              : translate('programmedCount', locale, { n: done })}
          </h2>
          <p className="mt-1 text-[15px] leading-normal text-green-700">
            {translate('programHint', locale)}
          </p>
        </div>
        <ScanStatus phase={phase} notice={notice} locale={locale} onResume={onResume} />
      </Card>

      {recent.length > 0 && (
        <section className="space-y-2">
          <SectionLabel className="px-1">{translate('recentBands', locale)}</SectionLabel>
          <Card as="ul" divided>
            {recent.map((band) => (
              <li key={band.number} className="flex min-h-12 items-center gap-3 px-4 py-2">
                <span className="min-w-0 flex-1 text-[15px] font-semibold text-green-900 tabular-nums">
                  {translate('bandNumber', locale, { n: band.number })}
                </span>
                {stateOf(band, locale)}
              </li>
            ))}
          </Card>
        </section>
      )}
    </div>
  );
};
