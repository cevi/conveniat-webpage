'use client';

import { AppFooterController } from '@/components/footer/hide-footer-context';
import { SetHideHeader } from '@/components/header/hide-header-context';
import { Button } from '@/components/ui/buttons/button';
import { EmptyState } from '@/components/ui/empty-state';
import { FactRow } from '@/components/ui/fact-row';
import { SectionLabel } from '@/components/ui/section-label';
import { ParticipantList } from '@/features/schedule/components/participant-list';
import { ReminderButton, ReminderHint } from '@/features/schedule/components/reminder-button';
import { mapCenterOf, ScheduleMiniMap } from '@/features/schedule/components/schedule-mini-map';
import { formatSpotsFilled, ShiftCapacity } from '@/features/schedule/components/shift-capacity';
import { ShiftEnrollmentAction } from '@/features/schedule/components/shift-enrollment-action';
import { ShiftMainContent } from '@/features/schedule/components/shift-main-content';
import { ShiftOrganisers } from '@/features/schedule/components/shift-organisers';
import { ShiftShareButton } from '@/features/schedule/components/shift-share-button';
import { programmeLabels } from '@/features/schedule/constants/schedule-labels';
import { useShiftStatus } from '@/features/schedule/hooks/use-shift-status';
import { useIsUnenrollmentClosed } from '@/features/schedule/hooks/use-unenrollment-window';
import { getCategoryAccent } from '@/features/schedule/utils/category-utils';
import { hasShiftMainContent } from '@/features/schedule/utils/has-shift-main-content';
import { resolveLocation } from '@/features/schedule/utils/location-utils';
import { slotOf } from '@/features/schedule/utils/programme-utils';
import { formatDuration } from '@/features/schedule/utils/time-utils';
import { formatCampDateTime } from '@/features/schedule/utils/unenrollment-deadline';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { formatScheduleDateTime } from '@/utils/format-schedule-date-time';
import { cn } from '@/utils/tailwindcss-override';
import { ArrowLeft, CalendarX, Clock, Flag, Lock, LockOpen, MapPin, Users } from 'lucide-react';
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

const notFoundLabel: StaticTranslationString = {
  en: 'Shift not found',
  de: 'Schichteinsatz nicht gefunden',
  fr: 'Service introuvable',
};

/** a round white button floating over the map */
const floatingButtonClassName =
  'flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white p-0 text-green-900 shadow-[0_2px_8px_rgba(0,0,0,0.16)] hover:bg-white';

const containerClassName =
  'bg-page fixed inset-x-0 top-(--preview-banner-height) bottom-0 z-[110] flex flex-col overflow-hidden';

/**
 * Everything about one shift, as a screen of its own.
 *
 * Built the way the programme detail is: where it is on a map at the top, with the way back and
 * sharing floating over it, then the title, the facts and the people. The app header and footer
 * step aside, and the enrolment is pinned to the bottom: a shift with a detailed description, a
 * roster and three organisers would otherwise push the one thing this screen exists for below
 * the fold.
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

  const backButton = (
    <button
      type="button"
      onClick={goBack}
      aria-label={backLabel[locale]}
      className={floatingButtonClassName}
    >
      <ArrowLeft className="h-[22px] w-[22px]" aria-hidden="true" />
    </button>
  );

  if (shift === undefined) {
    // Only a shift that is genuinely absent from a loaded feed is missing; while the feed is still
    // coming in, the same state would be a wrong answer rendered over a right one.
    if (isLoading) {
      return (
        <>
          {chrome}
          <div className={containerClassName}>
            <div className="absolute inset-x-0 top-0 z-20 flex p-3">{backButton}</div>
            <div className="flex-1 space-y-4 overflow-y-auto px-4 pt-[72px]">
              <div className="bg-quiet h-8 w-3/4 animate-pulse rounded-lg" />
              <div className="bg-quiet h-40 animate-pulse rounded-[14px]" />
              <div className="bg-quiet h-24 animate-pulse rounded-[14px]" />
            </div>
          </div>
        </>
      );
    }

    return (
      <>
        {chrome}
        <div className={cn(containerClassName, 'justify-center p-4')}>
          <EmptyState
            icon={CalendarX}
            title={notFoundLabel[locale]}
            action={
              <Button variant="quiet" size="touch" onClick={goBack}>
                <ArrowLeft aria-hidden="true" />
                {backLabel[locale]}
              </Button>
            }
          />
        </div>
      </>
    );
  }

  const accent = getCategoryAccent(shift.category);

  /*
   * The relationship is not a location until it is resolved: Payload hands back a plain id when
   * the feed was fetched at a lower depth, and `null` once the annotation it pointed at is gone.
   */
  const location = resolveLocation(shift.location);
  const hasMap = location !== undefined && mapCenterOf(location) !== undefined;

  const slot = slotOf(shift);
  // "So., 25. Juli" reads "So, 25. Juli" in a line that already has its separators
  const date = formatScheduleDateTime(
    locale,
    shift.timeslot.date,
    shift.timeslot.time,
  ).formattedDate.replace(/^(\p{L}+)\.,/u, '$1,');

  return (
    <>
      {chrome}

      <div className={containerClassName}>
        {/* Floating over the map: the way back on the left, sharing on the right */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between p-3 [&>*]:pointer-events-auto">
          {backButton}
          <ShiftShareButton
            shiftId={shiftId}
            shiftTitle={shift.title}
            locale={locale}
            compact
            className={floatingButtonClassName}
          />
        </div>

        <div className="flex-1 overflow-x-hidden overflow-y-auto">
          <article className="mx-auto w-full max-w-xl pb-6">
            {/*
              Where on the camp the shift is, first: the meeting point below says which tent,
              this says where to walk.
            */}
            {location !== undefined && hasMap && (
              <ScheduleMiniMap
                location={location}
                interactive={false}
                showOpenInMap={false}
                zoom={16}
                // the panel below overlaps the map's bottom edge; the swisstopo credit stays above it
                className="mt-0 h-[220px] rounded-none border-0 [&_.maplibregl-ctrl-bottom-right]:bottom-5"
              />
            )}

            <div
              className={cn(
                'bg-page relative space-y-4 px-4 pb-4 sm:px-6',
                // without a map, the floating buttons sit over the panel and need the room
                hasMap ? '-mt-4 rounded-t-[18px] pt-5' : 'pt-[72px]',
              )}
            >
              <header className="space-y-2">
                {accent.label !== '' && (
                  <div
                    className={cn(
                      'flex items-center gap-2 text-xs font-bold tracking-[0.08em] uppercase',
                      accent.text,
                    )}
                  >
                    <span className={cn('h-2 w-2 rounded-full', accent.bar)} />
                    {accent.label}
                  </div>
                )}
                <h1 className="font-heading text-heading text-[28px] leading-[1.15] font-extrabold">
                  {shift.title}
                </h1>
                {shift.description !== '' && (
                  <p className="text-base leading-relaxed text-green-700">{shift.description}</p>
                )}
              </header>

              {/* a Schichteinsatz the helper is enrolled in reminds them without being asked */}
              <div className="space-y-3">
                <ReminderButton
                  entryId={shift.id}
                  entryKind="shift"
                  locale={locale}
                  className="w-full"
                />
                <ReminderHint entryId={shift.id} entryKind="shift" locale={locale} />
              </div>

              {/* When, where, how full, and until when one can step back */}
              <div className="border-line overflow-hidden rounded-[14px] border bg-white">
                <FactRow
                  icon={Clock}
                  title={
                    <span className="tabular-nums">
                      {date !== '' && `${date} · `}
                      {shift.timeslot.time.replace(' - ', '–')}
                    </span>
                  }
                  {...(slot !== undefined && slot.end > slot.start
                    ? { sub: formatDuration(slot.end - slot.start) }
                    : {})}
                />

                {shift.meetingPoint !== undefined && shift.meetingPoint !== '' && (
                  <FactRow icon={Flag} title={shift.meetingPoint} sub={meetingPointLabel[locale]} />
                )}

                {location !== undefined && (
                  <FactRow
                    icon={MapPin}
                    title={location.title}
                    sub={programmeLabels.showOnMap[locale]}
                    href={`/app/map?locationId=${location.id}`}
                  />
                )}

                {/*
                  The only statement of capacity here. The enrolment control below used to repeat
                  it as `0 / 10 (10 Plätze frei)`, and the enrolled band as a pill on top of that.
                */}
                {status?.maxParticipants !== undefined && (
                  <FactRow
                    icon={Users}
                    title={formatSpotsFilled(status.enrolledCount, status.maxParticipants, locale)}
                  >
                    <ShiftCapacity status={status} locale={locale} withoutLabel className="mt-2" />
                  </FactRow>
                )}

                {status !== undefined && shift.enable_enrolment !== false && (
                  <FactRow
                    icon={isWithdrawalClosed ? Lock : LockOpen}
                    // no deadline at all: an admin set the window to zero, so it stays open
                    title={
                      status.unenrollmentDeadline == undefined
                        ? withdrawUntilStartLabel[locale]
                        : formatCampDateTime(status.unenrollmentDeadline, locale)
                    }
                    {...(status.unenrollmentDeadline == undefined
                      ? {}
                      : {
                          sub: isWithdrawalClosed
                            ? withdrawClosedLabel[locale]
                            : withdrawUntilLabel[locale],
                        })}
                  />
                )}
              </div>

              {/*
                Who signed up, for the organisers of this shift only. The component renders
                nothing for everyone else - the decision is the server's, `getShiftStatus` leaves
                `participants` empty unless the caller organises the shift.
              */}
              <ParticipantList courseId={shift.id} courseType="shift" />

              {hasShiftMainContent(shift.mainContent) && (
                <section>
                  <SectionLabel>{detailsLabel[locale]}</SectionLabel>
                  <div className="border-line mt-2 rounded-[14px] border bg-white p-4">
                    <ShiftMainContent blocks={shift.mainContent as unknown[]} locale={locale} />
                  </div>
                </section>
              )}

              <ShiftOrganisers organisers={shift.organiser} locale={locale} />
            </div>
          </article>
        </div>

        {/*
          Pinned rather than left in the flow: it used to sit between the description and the
          organisers, so a shift with a long description or a handful of contacts pushed the one
          thing this screen exists for below the fold.
        */}
        {shift.enable_enrolment !== false && (
          <div className="border-line shrink-0 border-t bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="mx-auto w-full max-w-xl">
              <ShiftEnrollmentAction
                shiftId={shift.id}
                enableEnrolment={shift.enable_enrolment}
                shiftTitle={shift.title}
                shiftTimeslot={shift.timeslot}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
};
