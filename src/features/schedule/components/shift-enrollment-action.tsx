'use client';

import { Button } from '@/components/ui/buttons/button';
/* eslint-disable import/no-restricted-paths -- alert dialog shared component used across features */
import {
  ChatAlertDialog,
  ChatAlertDialogAction,
  ChatAlertDialogCancel,
  ChatAlertDialogContent,
  ChatAlertDialogDescription,
  ChatAlertDialogFooter,
  ChatAlertDialogHeader,
  ChatAlertDialogTitle,
} from '@/features/chat/components/ui/chat-alert-dialog';
/* eslint-enable import/no-restricted-paths */
import { ShiftConflictDialog } from '@/features/schedule/components/shift-conflict-dialog';
import { useShiftStatus } from '@/features/schedule/hooks/use-shift-status';
import { useIsUnenrollmentClosed } from '@/features/schedule/hooks/use-unenrollment-window';
import { UNENROLLMENT_DEADLINE_PASSED } from '@/features/schedule/utils/unenrollment-deadline';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { AlertTriangle, CheckCircle, Loader2, Lock, RefreshCw, WifiOff } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useCurrentLocale } from 'next-i18n-router/client';
import { useOffline } from 'next/offline';
import React, { useState } from 'react';

const localizedEnroll: StaticTranslationString = {
  de: 'Einschreiben',
  en: 'Enroll',
  fr: "S'inscrire",
};

const localizedUnenroll: StaticTranslationString = {
  de: 'Abmelden',
  en: 'Unenroll',
  fr: 'Se désinscrire',
};

const localizedFull: StaticTranslationString = {
  de: 'Ausgebucht',
  en: 'Fully booked',
  fr: 'Complet',
};

const localizedEnrolled: StaticTranslationString = {
  de: 'Angemeldet',
  en: 'Enrolled',
  fr: 'Inscrit',
};

const localizedOffline: StaticTranslationString = {
  de: 'Offline – Anmeldung nicht möglich.',
  en: 'Offline – Enrollment unavailable.',
  fr: 'Hors ligne – Inscription impossible.',
};

const localizedUnavailable: StaticTranslationString = {
  de: 'Anmeldestatus konnte nicht geladen werden.',
  en: 'Could not load the enrollment status.',
  fr: "Impossible de charger l'état des inscriptions.",
};

const localizedOfflineShort: StaticTranslationString = {
  de: 'Offline',
  en: 'Offline',
  fr: 'Hors ligne',
};

const localizedUnavailableShort: StaticTranslationString = {
  de: 'Nicht verfügbar',
  en: 'Unavailable',
  fr: 'Indisponible',
};

const localizedRetry: StaticTranslationString = {
  de: 'Erneut versuchen',
  en: 'Try again',
  fr: 'Réessayer',
};

const localizedCancel: StaticTranslationString = {
  de: 'Abbrechen',
  en: 'Cancel',
  fr: 'Annuler',
};

const localizedUnenrollClosed: StaticTranslationString = {
  de: 'Abmeldefrist abgelaufen',
  en: 'Withdrawal deadline passed',
  fr: 'Délai de désinscription dépassé',
};

/** The card has one row for this; the sheet has room for the sentence below. */
const localizedUnenrollClosedShort: StaticTranslationString = {
  de: 'Frist abgelaufen',
  en: 'Deadline passed',
  fr: 'Délai dépassé',
};

const localizedUnenrollClosedHint: StaticTranslationString = {
  de: 'Melde dich direkt bei den Organisatoren, wenn du nicht kommen kannst.',
  en: 'Contact the organisers directly if you cannot make it.',
  fr: 'Contacte directement les organisateurs si tu ne peux pas venir.',
};

/** The warning a helper gets when the shift they are joining can no longer be left. */
const localizedEnrolWithoutExitWarning: StaticTranslationString = {
  de: 'Die Abmeldefrist für diesen Schichteinsatz ist bereits abgelaufen. Wenn du dich jetzt anmeldest, kannst du dich nicht mehr selbst abmelden.',
  en: 'The withdrawal deadline for this shift has already passed. If you enrol now, you will not be able to withdraw on your own.',
  fr: 'Le délai de désinscription de ce service est déjà dépassé. Si tu t’inscris maintenant, tu ne pourras plus te désinscrire toi-même.',
};

const localizedEnrolAnyway: StaticTranslationString = {
  de: 'Trotzdem anmelden',
  en: 'Enrol anyway',
  fr: 'S’inscrire quand même',
};

export const ShiftEnrollmentAction: React.FC<{
  shiftId: string;
  enableEnrolment?: boolean | null | undefined;
  /**
   * `card` is the single control at the bottom of a shift card, where the row it sits in is
   * shared with the organiser avatars. `detail` is the full band in the detail sheet, which is
   * the only place with room to explain a state rather than just show it.
   */
  variant?: 'card' | 'detail';
  /** Title and timeslot of this shift, so the conflict dialog can show what it is offering. */
  shiftTitle?: string;
  shiftTimeslot?: { date: string; time: string };
}> = ({ shiftId, enableEnrolment, variant = 'detail', shiftTitle, shiftTimeslot }) => {
  const isCard = variant === 'card';
  const { status: authStatus } = useSession();
  const isAuthorized = authStatus === 'authenticated';
  const locale = useCurrentLocale(i18nConfig) as Locale;

  const utils = trpc.useUtils();

  // `navigator.onLine` only reports the OS network interface, so it stays `true` on a phone that
  // is on WiFi with no upstream. Next's own signal is driven by real RSC fetch failures plus a
  // polling connectivity probe, and it clears itself as soon as the connection is back.
  const isOffline = useOffline();

  const { status, isLoading, isFetching, refetch } = useShiftStatus(shiftId);

  /**
   * A withdrawal the server refused as too late. The status is refetched at the same time, so this
   * only has to cover the moment between the rejection and the fresh deadline arriving - but
   * without it, a mutation fired from a page that had gone stale would fail silently.
   */
  const [wasRejectedAsTooLate, setWasRejectedAsTooLate] = useState(false);

  // called before the early returns below, as hooks must be
  const isUnenrollmentWindowClosed = useIsUnenrollmentClosed(status?.unenrollmentDeadline);

  /**
   * A helper about to enrol into a shift whose withdrawal window has already shut.
   *
   * Enrolling is still allowed - somebody has to be able to step in for a shift starting in an
   * hour - but it is a one-way door at that point, and the button gives no hint of that. The
   * confirmation is the only place the helper finds out before rather than after.
   */
  const [noWithdrawalDialogOpen, setNoWithdrawalDialogOpen] = useState(false);

  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [conflictType, setConflictType] = useState<'workshop' | 'shift'>('workshop');
  const [conflictInfo, setConflictInfo] = useState<
    { conflictingCourseName: string; conflictingCourseId: string } | undefined
  >();

  /**
   * The withdrawal window of the shift the helper would be leaving.
   *
   * Switching away from a shift is a withdrawal from it, so the same deadline applies - and it
   * is the *other* shift's deadline, not this card's. Asking before offering the switch is what
   * keeps the dialog from showing a button whose only possible outcome is a refusal. Held until
   * there is a conflicting shift to ask about, and skipped entirely for a workshop, which has no
   * withdrawal window of this kind.
   */
  const conflictingShiftId =
    conflictDialogOpen && conflictType === 'shift' ? conflictInfo?.conflictingCourseId : undefined;
  const { status: conflictingShiftStatus } = useShiftStatus(conflictingShiftId);
  const isConflictingWindowClosed = useIsUnenrollmentClosed(
    conflictingShiftStatus?.unenrollmentDeadline,
  );

  const enroll = trpc.shifts.enrollInShift.useMutation({
    onSuccess: () => {
      void utils.shifts.getShiftStatus.invalidate();
      void utils.shifts.getMyShiftEnrollments.invalidate();
      void utils.schedule.getHelperShifts.invalidate();
      void utils.shifts.getShifts.invalidate();
      setConflictDialogOpen(false);
      setConflictInfo(undefined);
    },
    onError: (error) => {
      if (error.message.includes('Time conflict with')) {
        const isShift = error.message.includes('with shift:');

        const match = error.message.match(
          /Time conflict with(?: (?:shift|workshop):)?\s*(.+)\|(.+)/,
        );
        if (match) {
          const conflictingCourseName = match[1] ?? 'another entry';
          const conflictingCourseId = match[2] ?? '';
          setConflictType(isShift ? 'shift' : 'workshop');
          setConflictInfo({
            conflictingCourseName,
            conflictingCourseId,
          });
          setConflictDialogOpen(true);
        }
      }
    },
  });

  const switchEnrollment = trpc.shifts.switchIntoShift.useMutation({
    onSuccess: () => {
      void utils.shifts.getShiftStatus.invalidate();
      void utils.shifts.getMyShiftEnrollments.invalidate();
      void utils.schedule.getHelperShifts.invalidate();
      void utils.shifts.getShifts.invalidate();
      setConflictDialogOpen(false);
      setConflictInfo(undefined);
    },
    onError: (error) => {
      // switching away from a shift is a withdrawal from it, so it hits the same deadline
      if (error.message.includes(UNENROLLMENT_DEADLINE_PASSED)) {
        setWasRejectedAsTooLate(true);
        void utils.shifts.getShiftStatus.invalidate();
        return;
      }
      console.error('Switch enrollment failed:', error.message);
    },
  });

  const unenroll = trpc.shifts.unenrollFromShift.useMutation({
    onSuccess: () => {
      void utils.shifts.getShiftStatus.invalidate();
      void utils.shifts.getMyShiftEnrollments.invalidate();
      void utils.schedule.getHelperShifts.invalidate();
      void utils.shifts.getShifts.invalidate();
    },
    onError: (error) => {
      if (error.message.includes(UNENROLLMENT_DEADLINE_PASSED)) {
        setWasRejectedAsTooLate(true);
        void utils.shifts.getShiftStatus.invalidate();
      }
    },
  });

  if (!enableEnrolment) return <></>;

  // `isLoading` only covers the first ever fetch. A shift whose cached value is unusable is not
  // loading by that definition, so keep the skeleton up while its refetch is in flight too.
  if (isLoading || (isFetching && !status)) {
    return isCard ? (
      <div className="h-9 w-28 shrink-0 animate-pulse rounded-lg bg-gray-100" />
    ) : (
      <div className="h-12 w-full animate-pulse rounded-lg bg-gray-200" />
    );
  }

  // Missing status is not the same as missing connectivity: it also happens when the request
  // failed or when a previously cached value turned out to be unusable. Only claim "offline" when
  // the app really is offline, and otherwise offer a retry instead of a dead end.
  if (!status) {
    // On the card this is one chip in a shared row: the icon carries the state, the title
    // carries the sentence, and the sheet behind the tap offers the retry.
    if (isCard) {
      return (
        <span
          title={isOffline ? localizedOffline[locale] : localizedUnavailable[locale]}
          className="flex shrink-0 items-center gap-1.5 text-xs text-amber-600"
        >
          {isOffline ? (
            <WifiOff className="h-3.5 w-3.5" />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5" />
          )}
          {isOffline ? localizedOfflineShort[locale] : localizedUnavailableShort[locale]}
        </span>
      );
    }

    return isOffline ? (
      <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-700">
        <WifiOff className="h-5 w-5 flex-shrink-0" />
        <span className="text-sm">{localizedOffline[locale]}</span>
      </div>
    ) : (
      <div className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-700">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm">{localizedUnavailable[locale]}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 self-start text-sm"
          onClick={() => void refetch()}
        >
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          {localizedRetry[locale]}
        </Button>
      </div>
    );
  }

  const { isEnrolled, enrolledCount, maxParticipants } = status;

  /**
   * Either the server already refused the switch as too late, or the conflicting shift's own
   * deadline says it would. The first covers a page that was stale when the helper tapped; the
   * second keeps the button from being offered in the first place.
   */
  const isSwitchBlocked = wasRejectedAsTooLate || isConflictingWindowClosed;

  const handleEnrolClick = (): void => {
    if (isUnenrollmentWindowClosed) {
      setNoWithdrawalDialogOpen(true);
      return;
    }
    enroll.mutate({ shiftId });
  };
  const isFull = maxParticipants !== undefined && enrolledCount >= maxParticipants;

  if (isEnrolled) {
    /**
     * The window is closed either because the deadline the server sent has passed, or because the
     * server just refused a withdrawal - the second case covers a page whose cached deadline was
     * already out of date by the time the helper tapped.
     */
    const isWithdrawalClosed = isUnenrollmentWindowClosed || wasRejectedAsTooLate;

    if (isCard) {
      // The badge in the card's corner already says "Angemeldet", so this row only has to carry
      // the way out - or, once the window has shut, the fact that there is none.
      return isWithdrawalClosed ? (
        // a pill of the same height and shape as the buttons it stands in for, so a feed of
        // cards in mixed states still lines up along one baseline
        <span
          title={localizedUnenrollClosedHint[locale]}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-3.5 text-xs font-medium text-gray-500"
        >
          <Lock className="h-3.5 w-3.5" />
          {localizedUnenrollClosedShort[locale]}
        </span>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => unenroll.mutate({ shiftId })}
          disabled={unenroll.isPending}
          className="h-9 shrink-0 px-3.5 text-sm"
        >
          {unenroll.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          {localizedUnenroll[locale]}
        </Button>
      );
    }

    return (
      /*
        The enrolment status is the one thing a helper opens this card for, so it gets its own
        band rather than another line of grey meta text. Everything about the enrolment lives
        inside it: the confirmation, how full the shift is, and either the way out or the reason
        there no longer is one.
      */
      <div className="rounded-lg border border-green-200 bg-green-50/60 px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="flex items-center gap-2 text-sm font-semibold text-green-700">
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
            {localizedEnrolled[locale]}
          </span>
          {!isWithdrawalClosed && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => unenroll.mutate({ shiftId })}
              disabled={unenroll.isPending}
              className="ml-auto h-8 border-green-200 bg-white text-sm hover:bg-white"
            >
              {unenroll.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {localizedUnenroll[locale]}
            </Button>
          )}
        </div>
        {/*
          Sits under the status on its own row instead of beside it: the two say different things
          - you are in, and you can no longer get out - and side by side they competed for the
          same line and wrapped into each other on a phone.
        */}
        {isWithdrawalClosed && (
          <div className="mt-2.5 flex items-start gap-2 border-t border-green-200/70 pt-2.5">
            <Lock className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-gray-500" />
            <p className="text-xs leading-relaxed text-gray-500">
              <span className="font-semibold text-gray-700">{localizedUnenrollClosed[locale]}</span>{' '}
              {localizedUnenrollClosedHint[locale]}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {isCard ? (
        /*
          No counts here: the badge and the rail above already say how full the shift is, and the
          old version repeated it twice more right next to this button.
        */
        <Button
          className={cn(
            'h-9 shrink-0 px-4 text-sm font-semibold transition-all duration-200 active:scale-95',
            isFull || !isAuthorized
              ? 'cursor-not-allowed bg-gray-200 text-gray-500'
              : 'bg-conveniat-green hover:bg-conveniat-green-dark text-white',
            enroll.isPending && 'opacity-80',
          )}
          disabled={isFull || enroll.isPending || !isAuthorized}
          onClick={handleEnrolClick}
        >
          {enroll.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
          {isFull ? localizedFull[locale] : localizedEnroll[locale]}
        </Button>
      ) : (
        <div className="flex flex-col gap-3">
          <Button
            className={cn(
              'h-12 text-lg font-bold transition-all duration-200 active:scale-95',
              isFull || !isAuthorized
                ? 'cursor-not-allowed bg-gray-200 text-gray-500'
                : 'bg-conveniat-green hover:bg-conveniat-green-dark text-white hover:scale-[1.02]',
              enroll.isPending && 'opacity-80',
            )}
            disabled={isFull || enroll.isPending || !isAuthorized}
            onClick={handleEnrolClick}
          >
            {enroll.isPending && (
              <span className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                {localizedEnroll[locale]}...
              </span>
            )}
            {!enroll.isPending && isFull && localizedFull[locale]}
            {!enroll.isPending && !isFull && localizedEnroll[locale]}
          </Button>
        </div>
      )}

      <ChatAlertDialog open={noWithdrawalDialogOpen} onOpenChange={setNoWithdrawalDialogOpen}>
        <ChatAlertDialogContent>
          <ChatAlertDialogHeader>
            <ChatAlertDialogTitle>{localizedUnenrollClosed[locale]}</ChatAlertDialogTitle>
            <ChatAlertDialogDescription>
              {localizedEnrolWithoutExitWarning[locale]}
            </ChatAlertDialogDescription>
          </ChatAlertDialogHeader>
          <div className="flex w-full items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-left text-sm text-amber-800">
            <Lock className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>{localizedUnenrollClosedHint[locale]}</p>
          </div>
          <ChatAlertDialogFooter className="gap-3 sm:gap-0">
            <ChatAlertDialogAction
              className="bg-conveniat-green hover:bg-conveniat-green-dark w-full text-white"
              onClick={(event: React.MouseEvent) => {
                event.preventDefault();
                enroll.mutate({ shiftId });
                setNoWithdrawalDialogOpen(false);
              }}
              disabled={enroll.isPending}
            >
              {enroll.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {localizedEnroll[locale]}...
                </>
              ) : (
                localizedEnrolAnyway[locale]
              )}
            </ChatAlertDialogAction>
            <ChatAlertDialogCancel disabled={enroll.isPending} className="w-full">
              {localizedCancel[locale]}
            </ChatAlertDialogCancel>
          </ChatAlertDialogFooter>
        </ChatAlertDialogContent>
      </ChatAlertDialog>

      <ShiftConflictDialog
        open={conflictDialogOpen}
        onOpenChange={setConflictDialogOpen}
        conflictType={conflictType}
        conflictingName={conflictInfo?.conflictingCourseName ?? ''}
        conflictingId={conflictInfo?.conflictingCourseId ?? ''}
        target={{ title: shiftTitle ?? '', timeslot: shiftTimeslot }}
        isSwitchBlocked={isSwitchBlocked}
        blockedDeadline={conflictingShiftStatus?.unenrollmentDeadline}
        isSwitching={switchEnrollment.isPending}
        onSwitch={() => {
          if (conflictInfo === undefined) return;
          switchEnrollment.mutate({
            fromCourseId: conflictInfo.conflictingCourseId,
            toShiftId: shiftId,
          });
        }}
        locale={locale}
      />
    </>
  );
};
