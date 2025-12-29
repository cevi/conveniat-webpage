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
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useStar } from '@/hooks/use-star';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { CheckCircle, Loader2, MessageSquare, Users, WifiOff } from 'lucide-react';
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

const localizedSpotsLeft: StaticTranslationString = {
  de: 'Plätze frei',
  en: 'spots left',
  fr: 'places restantes',
};

const localizedOffline: StaticTranslationString = {
  de: 'Du bist offline. Anmeldung nicht möglich.',
  en: 'You are offline. Enrollment unavailable.',
  fr: 'Vous êtes hors ligne. Inscription impossible.',
};

const localizedOfflineShort: StaticTranslationString = {
  de: 'Offline',
  en: 'Offline',
  fr: 'Hors ligne',
};

const localizedConflictDescription: StaticTranslationString = {
  de: 'Du bist bereits für einen Workshop angemeldet, der zur gleichen Zeit stattfindet:',
  en: 'You are already enrolled in a workshop at the same time:',
  fr: 'Vous êtes déjà inscrit à un atelier à la même heure:',
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

const localizedSwitchQuestion: StaticTranslationString = {
  de: 'Möchtest du dich vom anderen Kurs abmelden und dich für diesen Workshop anmelden?',
  en: 'Would you like to unenroll from the other course and enroll in this workshop?',
  fr: "Souhaitez-vous vous désinscrire de l'autre cours et vous inscrire à cet atelier?",
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
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const isOnline = useOnlineStatus();
  const utils = trpc.useUtils();
  const { isStarred, toggleStar } = useStar();
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [conflictInfo, setConflictInfo] = useState<ConflictInfo | undefined>();

  const { data: status, isLoading } = trpc.schedule.getCourseStatus.useQuery(
    { courseId },
    { enabled: isOnline },
  );

  const enroll = trpc.schedule.enrollInCourse.useMutation({
    onSuccess: () => {
      void utils.schedule.getCourseStatus.invalidate({ courseId });
      void utils.schedule.getMyEnrollments.invalidate();
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
        const match = error.message.match(/Time conflict with (.+)\|(.+)/);
        if (match) {
          const conflictingCourseName = match[1] ?? 'another workshop';
          const conflictingCourseId = match[2] ?? '';
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
      void utils.schedule.getCourseStatus.invalidate();
      void utils.schedule.getMyEnrollments.invalidate();
      // Auto-star the new course
      if (!isStarred(courseId)) {
        toggleStar(courseId);
      }
      setConflictDialogOpen(false);
      setConflictInfo(undefined);
    },
    onError: (error) => {
      console.error('Switch enrollment failed:', error.message);
    },
  });

  const unenroll = trpc.schedule.unenrollFromCourse.useMutation({
    onSuccess: () => {
      void utils.schedule.getCourseStatus.invalidate({ courseId });
      void utils.schedule.getMyEnrollments.invalidate();
    },
  });

  // Show offline warning
  if (!isOnline) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-700">
          <WifiOff className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm">{localizedOffline[locale]}</span>
        </div>
        <Button
          className="h-12 cursor-not-allowed bg-gray-200 text-lg font-bold text-gray-500"
          disabled
        >
          <WifiOff className="mr-2 h-5 w-5" />
          {localizedOfflineShort[locale]}
        </Button>
      </div>
    );
  }

  if (isLoading)
    return (
      <div className="flex flex-col gap-3">
        {/* Skeleton for participant count */}
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
        </div>
        {/* Skeleton for enrollment button */}
        <div className="h-12 w-full animate-pulse rounded-lg bg-gray-200" />
      </div>
    );

  if (!status?.enableEnrolment) return;

  const { isEnrolled, enrolledCount, maxParticipants } = status;
  const isFull = maxParticipants !== undefined && enrolledCount >= maxParticipants;
  const spotsLeft = maxParticipants === undefined ? undefined : maxParticipants - enrolledCount;

  if (isEnrolled) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="font-medium text-green-600">{localizedEnrolled[locale]}</span>
            {maxParticipants && (
              <span className="text-gray-400">
                ({enrolledCount} / {maxParticipants})
              </span>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => unenroll.mutate({ courseId })}
            disabled={unenroll.isPending}
            className="h-8 text-sm"
          >
            {unenroll.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            {localizedUnenroll[locale]}
          </Button>
        </div>
        {status.chatId && (
          <Button variant="outline" size="sm" className="gap-2" asChild>
            <Link href={`/app/chat/${status.chatId}`}>
              <MessageSquare className="h-4 w-4" />
              {localizedViewChat[locale]}
            </Link>
          </Button>
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
              ({spotsLeft} {localizedSpotsLeft[locale]})
            </span>
          )}
          {isFull && <span className="font-medium text-red-500">({localizedFull[locale]})</span>}
        </div>

        <Button
          className={cn(
            'h-12 text-lg font-bold transition-all duration-200 active:scale-95',
            isFull
              ? 'cursor-not-allowed bg-gray-200 text-gray-500'
              : 'bg-conveniat-green hover:bg-conveniat-green-dark text-white hover:scale-[1.02]',
            enroll.isPending && 'opacity-80',
          )}
          disabled={isFull || enroll.isPending}
          onClick={() => enroll.mutate({ courseId })}
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

      {/* Time Conflict Alert Dialog */}
      <ChatAlertDialog open={conflictDialogOpen} onOpenChange={setConflictDialogOpen}>
        <ChatAlertDialogContent>
          <ChatAlertDialogHeader>
            <ChatAlertDialogTitle>{localizedConflict[locale]}</ChatAlertDialogTitle>
            <ChatAlertDialogDescription>
              {localizedConflictDescription[locale]}
            </ChatAlertDialogDescription>
          </ChatAlertDialogHeader>
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="w-full rounded-lg bg-gray-50 p-4 text-center">
              <div className="text-lg font-bold text-gray-900">
                {conflictInfo?.conflictingCourseName}
              </div>
            </div>
            <p className="text-center text-sm text-gray-500">{localizedSwitchQuestion[locale]}</p>
          </div>
          <ChatAlertDialogFooter className="gap-3 sm:gap-0">
            <ChatAlertDialogAction
              className="bg-conveniat-green hover:bg-conveniat-green-dark w-full text-white"
              onClick={(event) => {
                event.preventDefault();
                if (conflictInfo) {
                  switchEnrollment.mutate({
                    fromCourseId: conflictInfo.conflictingCourseId,
                    toCourseId: courseId,
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
