'use client';

import type { HelperShiftFrontendType } from '@/features/schedule/api/get-helper-shifts';
import {
  ShiftCapacityBadge,
  ShiftCapacityBar,
} from '@/features/schedule/components/shift-capacity';
import { ShiftEnrollmentAction } from '@/features/schedule/components/shift-enrollment-action';
import { useShiftStatus } from '@/features/schedule/hooks/use-shift-status';
import { getCategoryDisplayData } from '@/features/schedule/utils/category-utils';
import { isShiftOver } from '@/features/schedule/utils/unenrollment-deadline';
import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Clock, MapPin } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import React from 'react';

const openDetailsLabel: StaticTranslationString = {
  en: 'Open shift details',
  de: 'Details zum Schichteinsatz öffnen',
  fr: 'Ouvrir les détails du service',
};

/**
 * One shift in the helper portal feed.
 *
 * The card answers the four questions somebody scrolling the feed actually has - what, when,
 * where, and is there still room - and nothing else. Everything that is a second step (the full
 * description, who else is enrolled, contacting an organiser) lives behind a tap, in
 * `ShiftDetailSheet`. Carrying all of it inline cost roughly a screen per shift, which is what
 * made a list of six shifts unreadable.
 */
export const ShiftCard: React.FC<{
  shift: HelperShiftFrontendType;
  locale: Locale;
}> = ({ shift, locale }) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParameters = useSearchParams();

  // shares its cache entry with the enrolment control below and with the sheet
  const { status } = useShiftStatus(shift.id);

  /**
   * A shift that has already finished is kept in the list - a helper still wants to find the one
   * they did this morning - but it stops competing with the shifts that still need people.
   */
  const isPast = isShiftOver(shift.timeslot);
  const isEnrolled = status?.isEnrolled ?? false;

  /**
   * The venue, without the directions.
   *
   * "Küchenzelt, hinterer Eingang" truncated mid-word on a phone and lost the part that matters.
   * Everything after the first comma is detail for the moment a helper is walking there, which is
   * the sheet's job - the feed only has to say which corner of the camp this is.
   */
  const shortMeetingPoint =
    shift.meetingPoint === undefined || shift.meetingPoint === ''
      ? undefined
      : (shift.meetingPoint.split(',')[0]?.trim() ?? shift.meetingPoint);

  const { label: categoryLabel, className: categoryClassName } = getCategoryDisplayData(
    shift.category,
  );

  /**
   * The detail lives at `?id=`, the way the programme detail does.
   *
   * A URL rather than component state, so the phone's back gesture closes it, the day the helper
   * was looking at survives the trip, and a link to a shift is something that can be sent.
   */
  const openDetail = (): void => {
    const parameters = new URLSearchParams(searchParameters.toString());
    parameters.set('id', shift.id);
    router.push(`${pathname}?${parameters.toString()}`);
  };

  return (
    <>
      {/*
        The whole card is the target rather than a "details" link: on a phone the tap area is the
        card either way, and a link at the bottom would be one more row in a layout whose problem
        was rows. The controls inside it stop propagation so enrolling never opens the sheet.
      */}
      <div
        role="button"
        tabIndex={0}
        aria-haspopup="dialog"
        aria-label={`${shift.title} – ${openDetailsLabel[locale]}`}
        onClick={openDetail}
        onKeyDown={(event: React.KeyboardEvent): void => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          openDetail();
        }}
        className={cn(
          // the raised surface and the press feedback are the affordance; a chevron on the title
          // only broke the right edge of every two-line heading
          'focus-visible:ring-conveniat-green cursor-pointer rounded-xl border border-gray-100 bg-white p-3.5 shadow-sm transition-all hover:shadow-md focus-visible:ring-2 focus-visible:outline-none active:scale-[0.995]',
          isPast && 'bg-gray-50/80 opacity-65 shadow-none hover:opacity-100',
        )}
      >
        <div className="flex items-start justify-between gap-3">
          {categoryLabel === '' ? (
            <span />
          ) : (
            <span
              className={cn(
                'inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-wide uppercase',
                categoryClassName,
              )}
            >
              {categoryLabel}
            </span>
          )}
          <ShiftCapacityBadge status={status} locale={locale} isPast={isPast} />
        </div>

        <h3 className="font-heading mt-2 text-base leading-snug font-semibold text-gray-900">
          {shift.title}
        </h3>

        {/* time and meeting point on one line: they are read together and neither is a sentence */}
        <div className="mt-1 flex min-w-0 items-center gap-2 text-xs text-gray-500">
          <span className="flex shrink-0 items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {shift.timeslot.time}
          </span>
          {shortMeetingPoint !== undefined && (
            <>
              <span aria-hidden="true" className="text-gray-300">
                ·
              </span>
              <span className="flex min-w-0 items-center gap-1">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{shortMeetingPoint}</span>
              </span>
            </>
          )}
        </div>

        {shift.description !== '' && (
          <p className="mt-1.5 line-clamp-1 text-xs text-gray-500">{shift.description}</p>
        )}

        <div className="mt-3">
          <ShiftCapacityBar
            status={status}
            locale={locale}
            isPast={isPast}
            // the badge is showing "Angemeldet" or "Vorbei", so the free spots need somewhere else
            withSpotsLabel={isEnrolled || isPast}
          />
        </div>

        {/*
          A fixed footer zone: same height on every card whatever state it is in, holding exactly
          one thing - the enrolment. Cards used to end in a link, a button, or a lock chip at
          three different heights, so no two cards in the feed lined up.
        */}
        <div className="mt-3 flex min-h-9 items-center justify-end">
          {(!isPast || isEnrolled) && (
            /*
              The guard sits on the control, not on the row: with it on the row, the empty half
              of the footer swallowed the tap and that part of the card stopped opening the sheet.
            */
            <span
              onClick={(event: React.MouseEvent): void => event.stopPropagation()}
              onKeyDown={(event: React.KeyboardEvent): void => event.stopPropagation()}
            >
              <ShiftEnrollmentAction
                shiftId={shift.id}
                enableEnrolment={shift.enable_enrolment}
                variant="card"
                shiftTitle={shift.title}
                shiftTimeslot={shift.timeslot}
              />
            </span>
          )}
        </div>
      </div>
    </>
  );
};
