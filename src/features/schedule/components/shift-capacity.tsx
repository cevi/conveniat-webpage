'use client';

import type { ShiftStatus } from '@/features/schedule/hooks/use-shift-status';
import { getSpotsLeftText } from '@/features/schedule/utils/spots-left-text';
import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { CheckCircle } from 'lucide-react';
import type React from 'react';

const localizedEnrolled: StaticTranslationString = {
  de: 'Angemeldet',
  en: 'Enrolled',
  fr: 'Inscrit',
};

const localizedFull: StaticTranslationString = {
  de: 'Ausgebucht',
  en: 'Fully booked',
  fr: 'Complet',
};

const localizedPast: StaticTranslationString = {
  de: 'Vorbei',
  en: 'Over',
  fr: 'Terminé',
};

export const localizedSpotsFilled: StaticTranslationString = {
  de: '{{count}} von {{max}} Plätzen belegt',
  en: '{{count}} of {{max}} spots filled',
  fr: '{{count}} sur {{max}} places occupées',
};

export const formatSpotsFilled = (
  enrolledCount: number,
  maxParticipants: number,
  locale: Locale,
): string =>
  localizedSpotsFilled[locale]
    .replace('{{count}}', String(enrolledCount))
    .replace('{{max}}', String(maxParticipants));

/**
 * One geometry for every badge in the corner of a card, so the only thing that varies between
 * them is colour: neutral for how full the shift is, green for the helper's own state.
 */
const BADGE_SHAPE =
  'flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap';

/**
 * How full a shift is, as one badge in the corner of the card.
 *
 * The card used to carry the same fact three times - "Max. Helfende: 8" in the meta row, "0 / 8"
 * next to the enrol button, and "(8 Plätze frei)" beside that - so the badge is deliberately the
 * only place on the card where a number about capacity appears. The exact count lives in the
 * detail sheet, where there is room to spell it out.
 */
export const ShiftCapacityBadge: React.FC<{
  status: ShiftStatus | undefined;
  locale: Locale;
  isPast?: boolean;
}> = ({ status, locale, isPast = false }) => {
  if (status === undefined) return <></>;

  const { isEnrolled, enrolledCount, maxParticipants } = status;

  // A shift that is over has no spots to offer, so how full it is stops being news. Whether the
  // helper was on it still is, which is why both chips show rather than one replacing the other.
  if (isPast) {
    return (
      <span className="flex shrink-0 items-center gap-1.5">
        {isEnrolled && (
          <span className={cn(BADGE_SHAPE, 'gap-1 bg-gray-100 text-gray-500')}>
            <CheckCircle className="h-3 w-3" />
            {localizedEnrolled[locale]}
          </span>
        )}
        <span className={cn(BADGE_SHAPE, 'bg-gray-100 text-gray-500')}>
          {localizedPast[locale]}
        </span>
      </span>
    );
  }

  // The state the helper is in outranks how full the shift is: once you are in, the number of
  // free spots is somebody else's problem.
  if (isEnrolled) {
    return (
      <span className={cn(BADGE_SHAPE, 'gap-1 bg-green-100 text-green-700')}>
        <CheckCircle className="h-3 w-3" />
        {localizedEnrolled[locale]}
      </span>
    );
  }

  if (maxParticipants === undefined) return <></>;

  const spotsLeft = maxParticipants - enrolledCount;

  if (spotsLeft <= 0) {
    return (
      <span className={cn(BADGE_SHAPE, 'bg-gray-100 text-gray-500')}>{localizedFull[locale]}</span>
    );
  }

  return (
    <span className={cn(BADGE_SHAPE, 'bg-gray-100 text-gray-600')}>
      {spotsLeft} {getSpotsLeftText(spotsLeft, locale)}
    </span>
  );
};

/**
 * The same capacity as a rail, so a glance down a list of cards shows which shifts still need
 * people without reading a single number.
 */
export const ShiftCapacityBar: React.FC<{
  status: ShiftStatus | undefined;
  locale: Locale;
  /**
   * Spell the free spots out next to the rail. The card turns this on exactly when the badge is
   * occupied by something else - being enrolled, or the shift being over - because a helper who
   * is already on a shift still needs to know whether it is short of people.
   */
  withSpotsLabel?: boolean;
  isPast?: boolean;
}> = ({ status, locale, withSpotsLabel = false, isPast = false }) => {
  if (status === undefined) return <></>;

  const { enrolledCount, maxParticipants } = status;
  if (maxParticipants === undefined || maxParticipants <= 0) return <></>;

  const filledRatio = Math.min(1, enrolledCount / maxParticipants);
  const spotsLeft = maxParticipants - enrolledCount;

  return (
    // fixed height: the label only appears in some states, and without this the row - and with
    // it the whole card - grew by a line the moment a helper enrolled
    <div className="flex h-4 items-center gap-2">
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={maxParticipants}
        aria-valuenow={enrolledCount}
        aria-label={formatSpotsFilled(enrolledCount, maxParticipants, locale)}
        className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-gray-100"
      >
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-300',
            filledRatio >= 1 || isPast ? 'bg-gray-300' : 'bg-conveniat-green',
          )}
          style={{ width: `${filledRatio * 100}%` }}
        />
      </div>
      {withSpotsLabel && (
        <span className="shrink-0 text-[11px] whitespace-nowrap text-gray-500">
          {spotsLeft > 0
            ? `${spotsLeft} ${getSpotsLeftText(spotsLeft, locale)}`
            : localizedFull[locale]}
        </span>
      )}
    </div>
  );
};
