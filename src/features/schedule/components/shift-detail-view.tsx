'use client';

import { AppFooterController } from '@/components/footer/hide-footer-context';
import { SetHideHeader } from '@/components/header/hide-header-context';
import { Button } from '@/components/ui/buttons/button';
import { ParticipantList } from '@/features/schedule/components/participant-list';
import { ScheduleMiniMap } from '@/features/schedule/components/schedule-mini-map';
import { formatSpotsFilled, ShiftCapacityBar } from '@/features/schedule/components/shift-capacity';
import { ShiftEnrollmentAction } from '@/features/schedule/components/shift-enrollment-action';
import { ShiftMainContent } from '@/features/schedule/components/shift-main-content';
import { ShiftOrganisers } from '@/features/schedule/components/shift-organisers';
import { ShiftShareButton } from '@/features/schedule/components/shift-share-button';
import { useShiftStatus } from '@/features/schedule/hooks/use-shift-status';
import { useIsUnenrollmentClosed } from '@/features/schedule/hooks/use-unenrollment-window';
import { getCategoryDisplayData } from '@/features/schedule/utils/category-utils';
import { hasShiftMainContent } from '@/features/schedule/utils/has-shift-main-content';
import { resolveLocation } from '@/features/schedule/utils/location-utils';
import { formatCampDateTime } from '@/features/schedule/utils/unenrollment-deadline';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { ChevronLeft, Clock, Lock, LockOpen, MapPin, Users } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type React from 'react';

const backLabel: StaticTranslationString = {
  en: 'Back',
  de: 'Zurück',
  fr: 'Retour',
};

const meetingPointLabel: StaticTranslationString = {
  en: 'Meeting point',
  de: 'Treffpunkt',
  fr: 'Point de rendez-vous',
};

const detailsLabel: StaticTranslationString = {
  en: 'Detailed Description',
  de: 'Detaillierte Beschreibung',
  fr: 'Description détaillée',
};

const withdrawUntilLabel: StaticTranslationString = {
  en: 'Withdrawal possible until',
  de: 'Abmelden möglich bis',
  fr: 'Désinscription possible jusqu’au',
};

const withdrawClosedLabel: StaticTranslationString = {
  en: 'Withdrawal closed since',
  de: 'Abmeldefrist abgelaufen seit',
  fr: 'Délai de désinscription dépassé depuis',
};

/** A shift whose window is set to zero stays open right up to its start - which is worth saying. */
const withdrawUntilStartLabel: StaticTranslationString = {
  en: 'Withdrawal possible until the shift starts',
  de: 'Abmelden bis zum Beginn möglich',
  fr: 'Désinscription possible jusqu’au début du service',
};

const locationLabel: StaticTranslationString = {
  en: 'Location',
  de: 'Ort',
  fr: 'Emplacement',
};

const notFoundLabel: StaticTranslationString = {
  en: 'Shift not found',
  de: 'Schichteinsatz nicht gefunden',
  fr: 'Service introuvable',
};

/**
 * Everything about one shift, as a screen of its own.
 *
 * Built the way the programme detail is: the app header and footer step aside, the view takes the
 * viewport, and the back button returns to the feed. A bottom sheet could only ever show part of
 * the content at once, and a shift with a detailed description, a roster and three organisers is
 * more than a sheet's worth.
 *
 * The shift comes out of the feed already in the client cache, so opening one costs no request
 * and works offline for anything the helper has scrolled past.
 */
export const ShiftDetailView: React.FC<{
  shiftId: string;
  locale: Locale;
}> = ({ shiftId, locale }) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParameters = useSearchParams();

  const { data: shifts, isLoading } = trpc.schedule.getHelperShifts.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  const shift = shifts?.find((entry) => entry.id === shiftId);

  const { status } = useShiftStatus(shiftId);

  // read from the deadline rather than from a flag, so a view left open past it corrects itself
  const isWithdrawalClosed = useIsUnenrollmentClosed(status?.unenrollmentDeadline);

  /**
   * Back to the feed, not back in the browser.
   *
   * `router.back()` is only correct when the feed is the previous entry, which it is not for a
   * shared link opened in a fresh tab - there it walked out of the app entirely, or nowhere at
   * all. Replacing the entry with the feed behaves the same in both cases and leaves no detour
   * in the history: the day being browsed rides along in `?date=`, and `scroll: false` keeps the
   * feed where it was, since the detail rendered over it rather than scrolling it.
   */
  const goBack = (): void => {
    const parameters = new URLSearchParams(searchParameters.toString());
    parameters.delete('id');
    const query = parameters.toString();
    router.replace(query === '' ? pathname : `${pathname}?${query}`, { scroll: false });
  };

  const chrome = (
    <>
      <SetHideHeader value />
      <AppFooterController hideAppFooter />
    </>
  );

  const header = (title?: string): React.ReactNode => (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-gray-100 bg-white/95 px-4 backdrop-blur-md">
      <button
        type="button"
        onClick={goBack}
        aria-label={backLabel[locale]}
        className="cursor-pointer rounded-xl p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <h1 className="font-heading min-w-0 flex-1 truncate text-lg font-bold text-gray-900">
        {title ?? ''}
      </h1>
      {title !== undefined && (
        <ShiftShareButton shiftId={shiftId} shiftTitle={title} locale={locale} />
      )}
    </header>
  );

  if (shift === undefined) {
    // Only a shift that is genuinely absent from a loaded feed is missing; while the feed is still
    // coming in, the same state would be a wrong answer rendered over a right one.
    if (isLoading) {
      return (
        <>
          {chrome}
          <div className="fixed inset-0 z-[110] flex flex-col overflow-hidden bg-gray-50">
            {header()}
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              <div className="h-40 animate-pulse rounded-xl bg-white" />
              <div className="h-24 animate-pulse rounded-xl bg-white" />
            </div>
          </div>
        </>
      );
    }

    return (
      <>
        {chrome}
        <div className="fixed inset-0 z-[110] flex flex-col items-center justify-center gap-4 bg-gray-50 p-8 text-center">
          <p className="text-gray-500">{notFoundLabel[locale]}</p>
          <Button onClick={goBack}>{backLabel[locale]}</Button>
        </div>
      </>
    );
  }

  const { label: categoryLabel, className: categoryClassName } = getCategoryDisplayData(
    shift.category,
  );

  /*
   * The relationship is not a location until it is resolved: Payload hands back a plain id when
   * the feed was fetched at a lower depth, and `null` once the annotation it pointed at is gone.
   */
  const location = resolveLocation(shift.location);

  return (
    <>
      {chrome}

      <div className="fixed inset-0 z-[110] flex flex-col overflow-hidden bg-gray-50">
        {header(shift.title)}

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          <section className="rounded-xl border border-gray-100 bg-white p-4">
            {categoryLabel !== '' && (
              <span
                className={cn(
                  'mb-3 inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-wide uppercase',
                  categoryClassName,
                )}
              >
                {categoryLabel}
              </span>
            )}

            <dl className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-700">
                <Clock className="h-4 w-4 shrink-0 text-gray-400" />
                <span>{shift.timeslot.time}</span>
              </div>
              {shift.meetingPoint !== undefined && shift.meetingPoint !== '' && (
                <div className="flex items-start gap-2 text-gray-700">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                  <span>
                    <span className="text-gray-500">{meetingPointLabel[locale]}: </span>
                    {shift.meetingPoint}
                  </span>
                </div>
              )}
              {/*
                The only statement of capacity here. The enrolment control below used to repeat it
                as `0 / 10 (10 Plätze frei)`, and the enrolled band as a pill on top of that.
              */}
              {status?.maxParticipants !== undefined && (
                <>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Users className="h-4 w-4 shrink-0 text-gray-400" />
                    <span>
                      {formatSpotsFilled(status.enrolledCount, status.maxParticipants, locale)}
                    </span>
                  </div>
                  <div className="pl-6">
                    <ShiftCapacityBar status={status} locale={locale} />
                  </div>
                </>
              )}
              {status !== undefined && shift.enable_enrolment !== false && (
                <div
                  className={cn(
                    'flex items-start gap-2',
                    isWithdrawalClosed ? 'text-gray-500' : 'text-gray-700',
                  )}
                >
                  {isWithdrawalClosed ? (
                    <Lock className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                  ) : (
                    <LockOpen className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                  )}
                  {status.unenrollmentDeadline == undefined ? (
                    // no deadline at all: an admin set the window to zero, so it stays open
                    <span className="text-gray-500">{withdrawUntilStartLabel[locale]}</span>
                  ) : (
                    <span>
                      <span className="text-gray-500">
                        {isWithdrawalClosed
                          ? withdrawClosedLabel[locale]
                          : withdrawUntilLabel[locale]}
                        :{' '}
                      </span>
                      {formatCampDateTime(status.unenrollmentDeadline, locale)}
                    </span>
                  )}
                </div>
              )}
            </dl>

            {shift.description !== '' && (
              <p className="mt-3 text-sm leading-relaxed text-gray-600">{shift.description}</p>
            )}

            {/*
              Who signed up, for the organisers of this shift only. The component renders nothing
              for everyone else - the decision is the server's, `getShiftStatus` leaves
              `participants` empty unless the caller organises the shift.
            */}
            <ParticipantList courseId={shift.id} courseType="shift" variant="inline" />

            <ShiftOrganisers organisers={shift.organiser} locale={locale} />
          </section>

          {/*
            Where on the camp the shift is, on the same map the programme details use. The
            meeting point above says which tent; this says where to walk.
          */}
          {location !== undefined && (
            <section className="rounded-xl border border-gray-100 bg-white p-4">
              <div className="mb-1 flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0 text-gray-400" />
                <span className="font-heading text-sm font-bold text-gray-900">
                  {location.title}
                </span>
                <span className="text-xs text-gray-400">{locationLabel[locale]}</span>
              </div>
              {/*
                Portrait, and capped in width so it stays portrait on a tablet instead of
                stretching back into a strip. Red marks the shift's own location: every other
                marker keeps its own colour and stays on the map, because they are what the
                helper orients by.
              */}
              <ScheduleMiniMap
                location={location}
                interactive={false}
                className="mx-auto aspect-[3/4] w-full max-w-xs"
              />
            </section>
          )}

          {hasShiftMainContent(shift.mainContent) && (
            <section className="rounded-xl border border-gray-100 bg-white p-4">
              <h2 className="font-heading mb-3 text-[11px] font-semibold tracking-wider text-gray-500 uppercase">
                {detailsLabel[locale]}
              </h2>
              <ShiftMainContent blocks={shift.mainContent as unknown[]} locale={locale} />
            </section>
          )}
        </div>

        {/*
          Pinned rather than left in the flow: it used to sit between the description and the
          organisers, so a shift with a long description or a handful of contacts pushed the one
          thing this screen exists for below the fold.
        */}
        {shift.enable_enrolment !== false && (
          <div className="shrink-0 border-t border-gray-100 bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <ShiftEnrollmentAction
              shiftId={shift.id}
              enableEnrolment={shift.enable_enrolment}
              shiftTitle={shift.title}
              shiftTimeslot={shift.timeslot}
            />
          </div>
        )}
      </div>
    </>
  );
};
