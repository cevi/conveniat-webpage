'use client';

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
import { Button } from '@/components/ui/buttons/button';
import { useCourseStatus } from '@/features/schedule/context/schedule-status-context';
import { UNENROLLMENT_DEADLINE_PASSED } from '@/features/schedule/utils/unenrollment-deadline';
import { useStar } from '@/hooks/use-star';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { handleLogin } from '@/utils/login-handler';
import { cn } from '@/utils/tailwindcss-override';
import { CheckCircle, Loader2, LogIn, MessageSquare, Users, WifiOff } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useCurrentLocale } from 'next-i18n-router/client';
import Link from 'next/link';
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

const localizedConflict: StaticTranslationString = {
  de: 'Zeitkonflikt',
  en: 'Time conflict',
  fr: 'Conflit horaire',
};

const localizedOffline: StaticTranslationString = {
  de: 'Du bist offline. Anmeldung nicht möglich.',
  en: 'You are offline. Enrollment unavailable.',
  fr: 'Vous êtes hors ligne. Inscription impossible.',
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
  de: 'Zu diesem Workshop wechseln',
  en: 'Switch to this workshop',
  fr: 'Passer à cet atelier',
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

const localizedSwitchQuestionWorkshop: StaticTranslationString = {
  de: 'Möchtest du dich vom anderen Kurs abmelden und dich für diesen Workshop anmelden?',
  en: 'Would you like to unenroll from the other course and enroll in this workshop?',
  fr: "Souhaitez-vous vous désinscrire de l'autre cours et vous inscrire à cet atelier?",
};

const localizedSwitchQuestionShift: StaticTranslationString = {
  de: 'Möchtest du dich vom Schichteinsatz abmelden und dich für diesen Workshop anmelden?',
  en: 'Would you like to unenroll from the other shift and enroll in this workshop?',
  fr: "Souhaitez-vous vous désinscrire de l'autre service et vous inscrire à cet atelier?",
};

const localizedSwitchBlockedShift: StaticTranslationString = {
  de: 'Die Abmeldefrist dieses Schichteinsatzes ist abgelaufen. Wechsel nicht möglich. Melde dich bei den Organisatoren.',
  en: 'The withdrawal deadline of this shift has passed. Switching is not possible. Contact the organisers.',
  fr: 'Le délai de désinscription de ce service est écoulé. Changement impossible. Contacte les organisateurs.',
};

const localizedSpotsOf: StaticTranslationString = {
  de: '{{left}} von {{max}} Plätzen frei',
  en: '{{left}} of {{max}} spots left',
  fr: '{{left}} places libres sur {{max}}',
};

const localizedSpotOf: StaticTranslationString = {
  de: '1 von {{max}} Plätzen frei',
  en: '1 of {{max}} spots left',
  fr: '1 place libre sur {{max}}',
};

const localizedEnrolledCount: StaticTranslationString = {
  de: '{{count}} eingeschrieben',
  en: '{{count}} enrolled',
  fr: '{{count}} inscrits',
};

const localizedLoginToEnrol: StaticTranslationString = {
  de: 'Zum Einschreiben anmelden',
  en: 'Log in to enrol',
  fr: 'Se connecter pour s’inscrire',
};

const localizedLeft: StaticTranslationString = {
  de: 'Du bist abgemeldet.',
  en: 'You have left this block.',
  fr: 'Tu t’es désinscrit.',
};

const localizedUndo: StaticTranslationString = {
  de: 'Rückgängig',
  en: 'Undo',
  fr: 'Annuler',
};

const localizedFailed: StaticTranslationString = {
  de: 'Das hat nicht geklappt. Versuche es nochmals.',
  en: 'That did not work. Please try again.',
  fr: 'Cela n’a pas fonctionné. Réessaie.',
};

const localizedViewChat: StaticTranslationString = {
  de: 'Gruppenchat öffnen',
  en: 'View Group Chat',
  fr: 'Voir le chat de groupe',
};

interface ConflictInfo {
  conflictingCourseName: string;
  conflictingCourseId: string;
}

export const EnrollmentAction: React.FC<{
  courseId: string;
}> = ({ courseId }) => {
  const { status: authStatus } = useSession();
  const isAuthorized = authStatus === 'authenticated';
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const { status, isLoading, isOnline } = useCourseStatus(courseId);
  const utils = trpc.useUtils();
  const { isStarred, toggleStar } = useStar();
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [conflictType, setConflictType] = useState<'workshop' | 'shift'>('workshop');
  const [conflictInfo, setConflictInfo] = useState<ConflictInfo | undefined>();
  const [isSwitchBlocked, setIsSwitchBlocked] = useState(false);
  // leaving is one tap, so it can be undone for as long as the block is on screen
  const [hasJustLeft, setHasJustLeft] = useState(false);

  const enroll = trpc.schedule.enrollInCourse.useMutation({
    onSuccess: () => {
      void utils.schedule.getCourseStatuses.invalidate();
      // The detail page reads the singular status for the roster and the admin actions; without
      // this it kept showing the participant list from before this enrolment.
      void utils.schedule.getCourseStatus.invalidate({ courseId });
      void utils.schedule.getMyEnrollments.invalidate();
      void utils.schedule.getHelperShifts.invalidate();
      void utils.shifts.getShifts.invalidate();
      setHasJustLeft(false);
      // Auto-star when enrolling
      if (!isStarred(courseId)) {
        toggleStar(courseId);
      }
      setConflictDialogOpen(false);
      setConflictInfo(undefined);
    },
    onError: (error) => {
      // Check if it's a time conflict error
      // Format: "Time conflict with [TITLE]|[ID]"
      if (error.message.includes('Time conflict with')) {
        const isShift = error.message.includes('with shift:');

        const match = error.message.match(
          /Time conflict with(?: (?:shift|workshop):)?\s*(.+)\|(.+)/,
        );
        if (match) {
          const conflictingCourseName = match[1] ?? 'another course';
          const conflictingCourseId = match[2] ?? '';
          setConflictType(isShift ? 'shift' : 'workshop');
          setIsSwitchBlocked(false);
          setConflictInfo({
            conflictingCourseName,
            conflictingCourseId,
          });
          setConflictDialogOpen(true);
        }
      }
    },
  });

  const switchEnrollment = trpc.schedule.switchEnrollment.useMutation({
    onSuccess: () => {
      void utils.schedule.getCourseStatuses.invalidate();
      // The detail page reads the singular status for the roster and the admin actions; without
      // this it kept showing the participant list from before this enrolment.
      void utils.schedule.getCourseStatus.invalidate({ courseId });
      void utils.schedule.getMyEnrollments.invalidate();
      void utils.schedule.getHelperShifts.invalidate();
      void utils.shifts.getShifts.invalidate();
      // Auto-star the new course
      if (!isStarred(courseId)) {
        toggleStar(courseId);
      }
      setConflictDialogOpen(false);
      setConflictInfo(undefined);
    },
    onError: (error) => {
      // switching away from a shift is a withdrawal from it, so it hits the same deadline
      if (error.message.includes(UNENROLLMENT_DEADLINE_PASSED)) {
        setIsSwitchBlocked(true);
        return;
      }
      console.error('Switch enrollment failed:', error.message);
    },
  });

  const unenroll = trpc.schedule.unenrollFromCourse.useMutation({
    onSuccess: () => {
      setHasJustLeft(true);
      void utils.schedule.getCourseStatuses.invalidate();
      // The detail page reads the singular status for the roster and the admin actions; without
      // this it kept showing the participant list from before this enrolment.
      void utils.schedule.getCourseStatus.invalidate({ courseId });
      void utils.schedule.getMyEnrollments.invalidate();
      void utils.schedule.getHelperShifts.invalidate();
      void utils.shifts.getShifts.invalidate();
    },
  });

  // Show offline warning only if we don't have cached data
  if (!isOnline && !status) {
    return (
      <div className="bg-quiet flex min-h-11 items-center gap-2 rounded-[14px] px-3.5 py-2.5 text-green-700">
        <WifiOff className="h-5 w-5 shrink-0" aria-hidden="true" />
        <span className="text-[15px]">{localizedOffline[locale]}</span>
      </div>
    );
  }

  if (isLoading && !status)
    return <div className="bg-quiet h-11 w-full animate-pulse rounded-xl" />;

  if (!status?.enableEnrolment) return;

  const { isEnrolled, enrolledCount, maxParticipants } = status;
  const isFull = maxParticipants !== undefined && enrolledCount >= maxParticipants;
  const spotsLeft = maxParticipants === undefined ? undefined : maxParticipants - enrolledCount;
  // a conflict opens its own dialog; anything else would otherwise fail without a word
  const hasFailed =
    (enroll.isError && conflictInfo === undefined) || unenroll.isError || switchEnrollment.isError;

  let capacity = localizedEnrolledCount[locale].replace('{{count}}', String(enrolledCount));
  if (isFull) capacity = localizedFull[locale];
  else if (spotsLeft !== undefined && maxParticipants !== undefined) {
    capacity = (spotsLeft === 1 ? localizedSpotOf : localizedSpotsOf)[locale]
      .replace('{{left}}', String(spotsLeft))
      .replace('{{max}}', String(maxParticipants));
  }

  const failedLine = hasFailed && (
    <p
      role="alert"
      className="bg-danger-soft text-danger-text rounded-xl px-3 py-2 text-[13px] font-medium"
    >
      {localizedFailed[locale]}
    </p>
  );

  if (isEnrolled) {
    return (
      <div className="flex flex-col gap-2">
        <div className="border-tint-line bg-tint rounded-[14px] border px-3.5 py-2">
          <div className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-2">
            <span className="flex items-center gap-2 text-[15px] font-semibold text-green-900">
              <CheckCircle className="text-conveniat-green h-5 w-5 shrink-0" aria-hidden="true" />
              {localizedEnrolled[locale]}
            </span>
            <Button
              variant="outlined"
              size="touch"
              onClick={() => unenroll.mutate({ courseId })}
              disabled={unenroll.isPending}
              // leaving is destructive, so red; it can be undone right after
              className="border-danger-line text-danger-text hover:bg-danger-soft ml-auto"
            >
              {unenroll.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
              {localizedUnenroll[locale]}
            </Button>
          </div>
          <p className="pb-1 text-[13px] text-green-700">{capacity}</p>
        </div>
        {status.chatId && (
          <Button variant="quiet" size="touch" asChild>
            <Link href={`/app/chat/${status.chatId}`}>
              <MessageSquare aria-hidden="true" />
              {localizedViewChat[locale]}
            </Link>
          </Button>
        )}
        {failedLine}
      </div>
    );
  }

  let action: React.ReactNode = (
    <Button
      variant="primary"
      size="touch"
      className="w-full"
      disabled={enroll.isPending}
      onClick={() => enroll.mutate({ courseId })}
    >
      {enroll.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
      {localizedEnroll[locale]}
    </Button>
  );
  // a full block is a state to read, so its line says so and there is no dead button
  if (isFull) action = undefined;
  else if (!isAuthorized) {
    action = (
      <Button variant="primary" size="touch" className="w-full" onClick={() => handleLogin()}>
        <LogIn aria-hidden="true" />
        {localizedLoginToEnrol[locale]}
      </Button>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        <p
          className={cn(
            'flex items-center gap-2 text-[15px] text-green-700',
            isFull && 'text-danger-text font-semibold',
          )}
        >
          <Users className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
          {capacity}
        </p>
        {action}
        {hasJustLeft && (
          <p
            aria-live="polite"
            className="flex min-h-11 items-center justify-between gap-2 text-[13px] text-green-700"
          >
            {localizedLeft[locale]}
            {!isFull && (
              <Button
                variant="quiet"
                size="touch"
                disabled={enroll.isPending}
                onClick={() => enroll.mutate({ courseId })}
              >
                {localizedUndo[locale]}
              </Button>
            )}
          </p>
        )}
        {failedLine}
      </div>

      {/* Time Conflict Alert Dialog */}
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
            <div className="bg-quiet w-full rounded-[14px] p-4 text-center">
              <div className="font-heading text-heading text-[17px] font-bold">
                {conflictInfo?.conflictingCourseName}
              </div>
            </div>
            {isSwitchBlocked ? (
              <p className="border-danger-line bg-danger-soft text-danger-text w-full rounded-[14px] border px-3.5 py-2.5 text-center text-sm">
                {localizedSwitchBlockedShift[locale]}
              </p>
            ) : (
              <p className="text-center text-sm text-green-700">
                {conflictType === 'shift'
                  ? localizedSwitchQuestionShift[locale]
                  : localizedSwitchQuestionWorkshop[locale]}
              </p>
            )}
          </div>
          <ChatAlertDialogFooter className="gap-3 sm:gap-0">
            <ChatAlertDialogAction
              className="bg-conveniat-green w-full text-white hover:bg-green-700"
              onClick={(event) => {
                event.preventDefault();
                if (conflictInfo) {
                  switchEnrollment.mutate({
                    fromCourseId: conflictInfo.conflictingCourseId,
                    toCourseId: courseId,
                    fromCourseType: conflictType,
                  });
                }
              }}
              disabled={switchEnrollment.isPending || isSwitchBlocked}
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
