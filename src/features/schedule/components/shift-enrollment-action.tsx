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
import { useIsUnenrollmentClosed } from '@/features/schedule/hooks/use-unenrollment-window';
import { getSpotsLeftText } from '@/features/schedule/utils/spots-left-text';
import { UNENROLLMENT_DEADLINE_PASSED } from '@/features/schedule/utils/unenrollment-deadline';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { AlertTriangle, CheckCircle, Loader2, Lock, RefreshCw, Users, WifiOff } from 'lucide-react';
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

const localizedRetry: StaticTranslationString = {
  de: 'Erneut versuchen',
  en: 'Try again',
  fr: 'Réessayer',
};

const localizedConflict: StaticTranslationString = {
  de: 'Zeitkonflikt',
  en: 'Time conflict',
  fr: 'Conflit horaire',
};

const localizedConflictDescWorkshop: StaticTranslationString = {
  de: 'Du bist bereits für einen Workshop angemeldet, der zur gleichen Zeit stattfindet:',
  en: 'You are already enrolled in a workshop at the same time:',
  fr: 'Vous êtes déjà inscrit à un atelier à la même heure:',
};

const localizedConflictDescShift: StaticTranslationString = {
  de: 'Du bist bereits für einen Schichteinsatz angemeldet, der zur gleichen Zeit stattfindet:',
  en: 'You are already enrolled in a shift at the same time:',
  fr: 'Vous êtes déjà inscrit à un service à la même heure:',
};

const localizedSwitchWorkshop: StaticTranslationString = {
  de: 'Zu diesem Schichteinsatz wechseln',
  en: 'Switch to this shift',
  fr: 'Passer à ce service',
};

const localizedCancel: StaticTranslationString = {
  de: 'Abbrechen',
  en: 'Cancel',
  fr: 'Annuler',
};

const localizedSwitching: StaticTranslationString = {
  de: 'Wechseln...',
  en: 'Switching...',
  fr: 'Changement...',
};

const localizedUnenrollClosed: StaticTranslationString = {
  de: 'Abmeldefrist abgelaufen',
  en: 'Withdrawal deadline passed',
  fr: 'Délai de désinscription dépassé',
};

const localizedUnenrollClosedHint: StaticTranslationString = {
  de: 'Melde dich direkt bei den Organisatoren, wenn du nicht kommen kannst.',
  en: 'Contact the organisers directly if you cannot make it.',
  fr: 'Contacte directement les organisateurs si tu ne peux pas venir.',
};

const localizedSwitchQuestion: StaticTranslationString = {
  de: 'Möchtest du dich abmelden und dich für diesen Schichteinsatz anmelden?',
  en: 'Would you like to unenroll and enroll in this shift instead?',
  fr: 'Souhaitez-vous vous désinscrire et vous inscrire à ce service à la place?',
};

export const ShiftEnrollmentAction: React.FC<{
  shiftId: string;
  enableEnrolment?: boolean | null | undefined;
}> = ({ shiftId, enableEnrolment }) => {
  const { status: authStatus } = useSession();
  const isAuthorized = authStatus === 'authenticated';
  const locale = useCurrentLocale(i18nConfig) as Locale;

  const utils = trpc.useUtils();

  // `navigator.onLine` only reports the OS network interface, so it stays `true` on a phone that
  // is on WiFi with no upstream. Next's own signal is driven by real RSC fetch failures plus a
  // polling connectivity probe, and it clears itself as soon as the connection is back.
  const isOffline = useOffline();

  const {
    data: status,
    isLoading,
    isFetching,
    refetch,
  } = trpc.shifts.getShiftStatus.useQuery(
    { shiftId },
    {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 60 * 24 * 7,
      // The global default is `refetchOnMount: false`, which meant a cached value was never
      // revalidated by reopening the shift — only a reconnect or an unrelated enrollment could
      // clear it. Combined with the 7-day `gcTime` and disk persistence, one bad value stuck.
      // A plain `true` would still respect `staleTime`, so a value cached less than five minutes
      // ago would survive the next visit; an empty status is never worth keeping for a moment, so
      // refetch it unconditionally and leave real data on the normal staleness schedule.
      refetchOnMount: (query) => (query.state.data == undefined ? 'always' : true),
    },
  );

  /**
   * A withdrawal the server refused as too late. The status is refetched at the same time, so this
   * only has to cover the moment between the rejection and the fresh deadline arriving - but
   * without it, a mutation fired from a page that had gone stale would fail silently.
   */
  const [wasRejectedAsTooLate, setWasRejectedAsTooLate] = useState(false);

  // called before the early returns below, as hooks must be
  const isUnenrollmentWindowClosed = useIsUnenrollmentClosed(status?.unenrollmentDeadline);

  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [conflictType, setConflictType] = useState<'workshop' | 'shift'>('workshop');
  const [conflictInfo, setConflictInfo] = useState<
    { conflictingCourseName: string; conflictingCourseId: string } | undefined
  >();

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
    return <div className="h-12 w-full animate-pulse rounded-lg bg-gray-200" />;
  }

  // Missing status is not the same as missing connectivity: it also happens when the request
  // failed or when a previously cached value turned out to be unusable. Only claim "offline" when
  // the app really is offline, and otherwise offer a retry instead of a dead end.
  if (!status) {
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
  const isFull = maxParticipants !== undefined && enrolledCount >= maxParticipants;
  const spotsLeft = maxParticipants === undefined ? undefined : maxParticipants - enrolledCount;

  if (isEnrolled) {
    /**
     * The window is closed either because the deadline the server sent has passed, or because the
     * server just refused a withdrawal - the second case covers a page whose cached deadline was
     * already out of date by the time the helper tapped.
     */
    const isWithdrawalClosed = isUnenrollmentWindowClosed || wasRejectedAsTooLate;

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
          {/* `whitespace-nowrap`: the count is one token to a reader and must never break apart */}
          {maxParticipants && (
            <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium whitespace-nowrap text-green-700 ring-1 ring-green-200 ring-inset">
              {enrolledCount} / {maxParticipants}
            </span>
          )}
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
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Users className="h-4 w-4" />
          <span>
            {enrolledCount}
            {maxParticipants ? ` / ${maxParticipants}` : ''}
          </span>
          {spotsLeft !== undefined && spotsLeft > 0 && (
            <span className="text-green-600">
              ({spotsLeft} {getSpotsLeftText(spotsLeft, locale)})
            </span>
          )}
          {isFull && <span className="font-medium text-red-500">({localizedFull[locale]})</span>}
        </div>

        <Button
          className={cn(
            'h-12 text-lg font-bold transition-all duration-200 active:scale-95',
            isFull || !isAuthorized
              ? 'cursor-not-allowed bg-gray-200 text-gray-500'
              : 'bg-conveniat-green hover:bg-conveniat-green-dark text-white hover:scale-[1.02]',
            enroll.isPending && 'opacity-80',
          )}
          disabled={isFull || enroll.isPending || !isAuthorized}
          onClick={() => enroll.mutate({ shiftId })}
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

      <ChatAlertDialog open={conflictDialogOpen} onOpenChange={setConflictDialogOpen}>
        <ChatAlertDialogContent>
          <ChatAlertDialogHeader>
            <ChatAlertDialogTitle>{localizedConflict[locale]}</ChatAlertDialogTitle>
            <ChatAlertDialogDescription>
              {conflictType === 'shift'
                ? localizedConflictDescShift[locale]
                : localizedConflictDescWorkshop[locale]}
            </ChatAlertDialogDescription>
          </ChatAlertDialogHeader>
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="w-full rounded-lg bg-gray-50 p-4 text-center">
              <div className="text-lg font-bold text-gray-900">
                {conflictInfo?.conflictingCourseName}
              </div>
            </div>
            <p className="text-center text-sm text-gray-500">{localizedSwitchQuestion[locale]}</p>
            {/* the shift being left is too close to its start, so the switch was refused */}
            {wasRejectedAsTooLate && (
              <div className="flex w-full items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-left text-sm text-amber-800">
                <Lock className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <p>
                  <span className="font-semibold">{localizedUnenrollClosed[locale]}</span>{' '}
                  {localizedUnenrollClosedHint[locale]}
                </p>
              </div>
            )}
          </div>
          <ChatAlertDialogFooter className="gap-3 sm:gap-0">
            <ChatAlertDialogAction
              className="bg-conveniat-green hover:bg-conveniat-green-dark w-full text-white"
              onClick={(event: React.MouseEvent) => {
                event.preventDefault();
                if (conflictInfo) {
                  switchEnrollment.mutate({
                    fromCourseId: conflictInfo.conflictingCourseId,
                    toShiftId: shiftId,
                  });
                }
              }}
              disabled={switchEnrollment.isPending}
            >
              {switchEnrollment.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {localizedSwitching[locale]}
                </>
              ) : (
                localizedSwitchWorkshop[locale]
              )}
            </ChatAlertDialogAction>
            <ChatAlertDialogCancel disabled={switchEnrollment.isPending} className="w-full">
              {localizedCancel[locale]}
            </ChatAlertDialogCancel>
          </ChatAlertDialogFooter>
        </ChatAlertDialogContent>
      </ChatAlertDialog>
    </>
  );
};
