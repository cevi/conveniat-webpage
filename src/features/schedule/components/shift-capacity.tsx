'use client';

import type { ShiftStatus } from '@/features/schedule/hooks/use-shift-status';
import { getSpotsLeftText } from '@/features/schedule/utils/spots-left-text';
import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import type React from 'react';

const localizedFull: StaticTranslationString = {
  de: 'Ausgebucht',
  en: 'Fully booked',
  fr: 'Complet',
};

export const localizedPast: StaticTranslationString = {
  de: 'Vorbei',
  en: 'Over',
  fr: 'Terminé',
};

export const localizedSpotsFilled: StaticTranslationString = {
  de: '{{count}} von {{max}} Plätzen belegt',
  en: '{{count}} of {{max}} spots filled',
  fr: '{{count}} sur {{max}} places occupées',
};

/** "2 von 6 Plätzen belegt" */
export const formatSpotsFilled = (
  enrolledCount: number,
  maxParticipants: number,
  locale: Locale,
): string =>
  localizedSpotsFilled[locale]
    .replace('{{count}}', String(enrolledCount))
    .replace('{{max}}', String(maxParticipants));

/**
 * How full a shift is, quietly: the free spots and a rail in brand green under them.
 *
 * The only place on a card where a number about capacity appears. A full shift turns the rail
 * and the label orange - the warning colour of the app - so a glance down the list shows which
 * shifts still need people without reading a single number. Once the shift is over, how full it
 * was stops being news and the line says so instead.
 */
export const ShiftCapacity: React.FC<{
  status: ShiftStatus | undefined;
  locale: Locale;
  isPast?: boolean;
  /** leaves out the label, where a line above already spells the count out */
  withoutLabel?: boolean;
  className?: string;
}> = ({ status, locale, isPast = false, withoutLabel = false, className }) => {
  if (status === undefined) return <></>;

  const { enrolledCount, maxParticipants } = status;
  if (maxParticipants === undefined || maxParticipants <= 0) return <></>;

  const filledRatio = Math.min(1, enrolledCount / maxParticipants);
  const spotsLeft = maxParticipants - enrolledCount;
  const isFull = spotsLeft <= 0;

  let label = `${spotsLeft} ${getSpotsLeftText(spotsLeft, locale)}`;
  if (isPast) label = localizedPast[locale];
  else if (isFull) label = localizedFull[locale];

  return (
    // the label over the rail rather than beside it: next to an enrol button on a phone, a rail
    // and a label side by side squeezed each other down to nothing
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      {!withoutLabel && (
        <span
          className={cn(
            'text-[13px] leading-[18px] tabular-nums',
            isPast && 'text-green-500',
            !isPast && isFull && 'text-live-text font-semibold',
            !isPast && !isFull && 'text-green-700',
          )}
        >
          {label}
        </span>
      )}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={maxParticipants}
        aria-valuenow={enrolledCount}
        aria-label={formatSpotsFilled(enrolledCount, maxParticipants, locale)}
        className="bg-quiet h-1.5 w-full overflow-hidden rounded-full"
      >
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-300',
            isPast && 'bg-rail-node',
            !isPast && isFull && 'bg-live',
            !isPast && !isFull && 'bg-conveniat-green',
          )}
          style={{ width: `${filledRatio * 100}%` }}
        />
      </div>
    </div>
  );
};
