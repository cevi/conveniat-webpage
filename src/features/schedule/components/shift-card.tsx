'use client';

import type { HelperShiftFrontendType } from '@/features/schedule/api/get-helper-shifts';
import { ScheduleTimelineItem } from '@/features/schedule/components/schedule-timeline-item';
import { ShiftCapacity } from '@/features/schedule/components/shift-capacity';
import { ShiftEnrollmentAction } from '@/features/schedule/components/shift-enrollment-action';
import { programmeLabels, scheduleLabels } from '@/features/schedule/constants/schedule-labels';
import { useShiftStatus } from '@/features/schedule/hooks/use-shift-status';
import { getCategoryAccent } from '@/features/schedule/utils/category-utils';
import { resolveLocation } from '@/features/schedule/utils/location-utils';
import { slotOf } from '@/features/schedule/utils/programme-utils';
import { formatDuration } from '@/features/schedule/utils/time-utils';
import { isShiftOver } from '@/features/schedule/utils/unenrollment-deadline';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { CheckCircle, Clock, MapPin } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import type React from 'react';

/**
 * One shift in the helper portal feed, as a stop on the day's timeline like a block of the
 * programme: the start in the time column, the card with what, until when, where and how full.
 *
 * Everything that is a second step (the full description, who else is enrolled, contacting an
 * organiser) lives behind a tap, on the shift's own page.
 */
export const ShiftCard: React.FC<{
  shift: HelperShiftFrontendType;
  locale: Locale;
}> = ({ shift, locale }) => {
  const pathname = usePathname();
  const searchParameters = useSearchParams();

  // shares its cache entry with the enrolment control below and with the detail page
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
   * the detail page's job - the feed only has to say which corner of the camp this is.
   */
  const shortMeetingPoint =
    shift.meetingPoint === undefined || shift.meetingPoint === ''
      ? undefined
      : (shift.meetingPoint.split(',')[0]?.trim() ?? shift.meetingPoint);
  const place = shortMeetingPoint ?? resolveLocation(shift.location)?.title;

  const accent = getCategoryAccent(shift.category);
  const [start = shift.timeslot.time, end = ''] = shift.timeslot.time.split(' - ');
  const slot = slotOf(shift);

  /**
   * The detail lives at `?id=`, the way the programme detail does.
   *
   * A URL rather than component state, so the phone's back gesture closes it, the day the helper
   * was looking at survives the trip, and a link to a shift is something that can be sent.
   */
  const parameters = new URLSearchParams(searchParameters.toString());
  parameters.set('id', shift.id);
  const href = `${pathname}?${parameters.toString()}`;

  const hasCapacity = status?.maxParticipants !== undefined && status.maxParticipants > 0;
  const hasEnrolment = shift.enable_enrolment === true && (!isPast || isEnrolled);

  return (
    <ScheduleTimelineItem
      className={cn(isPast && 'opacity-55')}
      time={<time className="font-bold text-green-900">{start}</time>}
      node={
        <span
          className={cn('ring-page h-3 w-3 rounded-full ring-2', accent.bar)}
          aria-hidden="true"
        />
      }
    >
      <div className="border-line mb-3.5 overflow-hidden rounded-[14px] border bg-white">
        <Link href={href} className="block px-3.5 py-3">
          {accent.label !== '' && (
            <div className={cn('text-xs font-semibold', accent.text)}>{accent.label}</div>
          )}
          <h3 className="mt-0.5 flex items-center gap-1.5 text-[17px] leading-[22px] font-[650] text-green-900">
            <span className="truncate">{shift.title}</span>
            {isEnrolled && (
              <CheckCircle
                className="text-conveniat-green h-4 w-4 shrink-0"
                aria-label={scheduleLabels.enrolledBadge[locale]}
              />
            )}
          </h3>
          <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[13px] leading-[18px] text-green-700">
            {slot !== undefined && slot.end > slot.start && (
              <span className="flex items-center gap-1 tabular-nums">
                <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {programmeLabels.until[locale].replace('{{time}}', end)} ·{' '}
                {formatDuration(slot.end - slot.start)}
              </span>
            )}
            {place !== undefined && place !== '' && (
              <span className="flex min-w-0 items-center gap-1">
                <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{place}</span>
              </span>
            )}
          </p>
        </Link>

        {/*
          How full it is and the way in, under a line the way the programme card carries its
          enrolment. Outside the link, so enrolling never opens the detail page.
        */}
        {(hasCapacity || hasEnrolment) && (
          <div className="border-line flex min-h-[60px] items-center gap-3 border-t px-3.5 py-2">
            <ShiftCapacity status={status} locale={locale} isPast={isPast} className="flex-1" />
            {hasEnrolment && (
              <span className="ml-auto shrink-0">
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
        )}
      </div>
    </ScheduleTimelineItem>
  );
};
