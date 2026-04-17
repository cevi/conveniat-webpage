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
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { CheckCircle, Loader2, Users, WifiOff } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useCurrentLocale } from 'next-i18n-router/client';
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

const localizedSpotsLeft: StaticTranslationString = {
  de: 'Plätze frei',
  en: 'spots left',
  fr: 'places restantes',
};

const localizedOffline: StaticTranslationString = {
  de: 'Offline – Anmeldung nicht möglich.',
  en: 'Offline – Enrollment unavailable.',
  fr: 'Hors ligne – Inscription impossible.',
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

  const { data: status, isLoading } = trpc.shifts.getShiftStatus.useQuery({ shiftId });

  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [conflictType, setConflictType] = useState<'workshop' | 'shift'>('workshop');
  const [conflictInfo, setConflictInfo] = useState<
    { conflictingCourseName: string; conflictingCourseId: string } | undefined
  >();

  const enroll = trpc.shifts.enrollInShift.useMutation({
    onSuccess: () => {
      void utils.shifts.getShiftStatus.invalidate();
      void utils.shifts.getMyShiftEnrollments.invalidate();
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
      setConflictDialogOpen(false);
      setConflictInfo(undefined);
    },
    onError: (error) => {
      console.error('Switch enrollment failed:', error.message);
    },
  });

  const unenroll = trpc.shifts.unenrollFromShift.useMutation({
    onSuccess: () => {
      void utils.shifts.getShiftStatus.invalidate();
      void utils.shifts.getMyShiftEnrollments.invalidate();
    },
  });

  if (!enableEnrolment) return <></>;

  if (isLoading) {
    return <div className="h-12 w-full animate-pulse rounded-lg bg-gray-200" />;
  }

  // Cannot show enrollment if we don't have status yet and are not loading
  if (!status) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-700">
        <WifiOff className="h-5 w-5 flex-shrink-0" />
        <span className="text-sm">{localizedOffline[locale]}</span>
      </div>
    );
  }

  const { isEnrolled, enrolledCount, maxParticipants } = status;
  const isFull = maxParticipants !== undefined && enrolledCount >= maxParticipants;
  const spotsLeft = maxParticipants === undefined ? undefined : maxParticipants - enrolledCount;

  if (isEnrolled) {
    return (
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
          onClick={() => unenroll.mutate({ shiftId })}
          disabled={unenroll.isPending}
          className="h-8 text-sm"
        >
          {unenroll.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          {localizedUnenroll[locale]}
        </Button>
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
