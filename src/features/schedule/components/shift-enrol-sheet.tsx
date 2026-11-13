'use client';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/buttons/button';
import { FactRow } from '@/components/ui/fact-row';
import { SectionLabel } from '@/components/ui/section-label';
import { segmentClassName, segmentedTrackClassName } from '@/components/ui/segmented-control';
import type { EnrolmentHof } from '@/features/schedule/api/shift-hof';
import { slotOf } from '@/features/schedule/utils/programme-utils';
import { formatDuration } from '@/features/schedule/utils/time-utils';
import { formatCampDateTime } from '@/features/schedule/utils/unenrollment-deadline';
import type { Locale, StaticTranslationString } from '@/types/types';
import { formatScheduleDateTime } from '@/utils/format-schedule-date-time';
import { cn } from '@/utils/tailwindcss-override';
import { Clock, Flag, Loader2, Lock, LockOpen } from 'lucide-react';
import type React from 'react';

const confirmLabel: StaticTranslationString = {
  de: 'Verbindlich anmelden',
  en: 'Enrol for sure',
  fr: 'M’inscrire pour de bon',
};

const enrolAnywayLabel: StaticTranslationString = {
  de: 'Trotzdem anmelden',
  en: 'Enrol anyway',
  fr: 'S’inscrire quand même',
};

const meetingPointLabel: StaticTranslationString = {
  de: 'Treffpunkt',
  en: 'Meeting point',
  fr: 'Point de rendez-vous',
};

const withdrawUntilLabel: StaticTranslationString = {
  de: 'Abmelden möglich bis',
  en: 'Withdrawal possible until',
  fr: 'Désinscription possible jusqu’au',
};

const withdrawUntilStartLabel: StaticTranslationString = {
  de: 'Abmelden bis zum Beginn möglich',
  en: 'Withdrawal possible until the shift starts',
  fr: 'Désinscription possible jusqu’au début du service',
};

const noWithdrawalWarning: StaticTranslationString = {
  de: 'Die Abmeldefrist ist bereits abgelaufen. Wenn du dich jetzt anmeldest, kannst du dich nicht mehr selbst abmelden. Melde dich bei der Schichtleitung, wenn du dann doch nicht kommen kannst.',
  en: 'The withdrawal deadline has already passed. If you enrol now, you cannot withdraw on your own. Contact the shift leads if you then cannot make it.',
  fr: 'Le délai de désinscription est déjà dépassé. Si tu t’inscris maintenant, tu ne pourras plus te désinscrire toi-même. Contacte les responsables du service si tu ne peux finalement pas venir.',
};

const countsForLabel: StaticTranslationString = {
  de: 'Zählt für',
  en: 'Counts for',
  fr: 'Compte pour',
};

const countsForHint: StaticTranslationString = {
  de: 'Du bist in mehreren Höfen angemeldet. Der Einsatz zählt für den Hof, den du wählst.',
  en: 'You are registered in several Höfe. The shift counts for the Hof you choose.',
  fr: 'Tu es inscrit dans plusieurs Höfe. Le service compte pour le Hof que tu choisis.',
};

/**
 * What a helper agrees to before the enrolment is made: when, where, until when they can still
 * step back, and for a person in several Höfe, which one the shift counts for. Enrolling from a
 * card used to take one tap, and the withdrawal deadline only showed on the detail page.
 */
export const ShiftEnrolSheet: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  timeslot: { date: string; time: string } | undefined;
  meetingPoint: string | undefined;
  /** the instant withdrawing closes, absent when it stays open until the start */
  unenrollmentDeadline: string | undefined;
  isWithdrawalClosed: boolean;
  /** the Höfe the user is in; a choice is offered from two on */
  hoefe: EnrolmentHof[];
  chosenHofId: string | undefined;
  onChooseHof: (hofId: string) => void;
  onConfirm: () => void;
  isPending: boolean;
  locale: Locale;
}> = ({
  open,
  onOpenChange,
  title,
  timeslot,
  meetingPoint,
  unenrollmentDeadline,
  isWithdrawalClosed,
  hoefe,
  chosenHofId,
  onChooseHof,
  onConfirm,
  isPending,
  locale,
}) => {
  const slot = timeslot === undefined ? undefined : slotOf({ timeslot });
  const date =
    timeslot === undefined
      ? ''
      : formatScheduleDateTime(locale, timeslot.date, timeslot.time).formattedDate.replace(
          /^(\p{L}+)\.,/u,
          '$1,',
        );
  const needsHofChoice = hoefe.length > 1;
  const canConfirm = !isPending && (!needsHofChoice || chosenHofId !== undefined);

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      footer={
        <Button
          variant="primary"
          size="touch"
          className="w-full"
          disabled={!canConfirm}
          onClick={onConfirm}
        >
          {isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
          {(isWithdrawalClosed ? enrolAnywayLabel : confirmLabel)[locale]}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="border-line overflow-hidden rounded-[14px] border bg-white">
          {timeslot !== undefined && (
            <FactRow
              icon={Clock}
              title={
                <span className="tabular-nums">
                  {date !== '' && `${date} · `}
                  {timeslot.time.replace(' - ', '–')}
                </span>
              }
              {...(slot !== undefined && slot.end > slot.start
                ? { sub: formatDuration(slot.end - slot.start) }
                : {})}
            />
          )}
          {meetingPoint !== undefined && meetingPoint !== '' && (
            <FactRow icon={Flag} title={meetingPoint} sub={meetingPointLabel[locale]} />
          )}
          {!isWithdrawalClosed && (
            <FactRow
              icon={LockOpen}
              title={
                unenrollmentDeadline === undefined
                  ? withdrawUntilStartLabel[locale]
                  : formatCampDateTime(unenrollmentDeadline, locale)
              }
              {...(unenrollmentDeadline === undefined ? {} : { sub: withdrawUntilLabel[locale] })}
            />
          )}
        </div>

        {isWithdrawalClosed && (
          <div className="border-danger-line bg-danger-soft text-danger-text flex items-start gap-2 rounded-[14px] border p-3 text-[15px]">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>{noWithdrawalWarning[locale]}</p>
          </div>
        )}

        {needsHofChoice && (
          <section>
            <SectionLabel>{countsForLabel[locale]}</SectionLabel>
            <div className={cn(segmentedTrackClassName, 'mt-2')} role="group">
              {hoefe.map((hof) => (
                <button
                  key={hof.id}
                  type="button"
                  aria-pressed={hof.id === chosenHofId}
                  className={cn(segmentClassName(hof.id === chosenHofId), 'flex-1 text-[15px]')}
                  onClick={() => onChooseHof(hof.id)}
                >
                  <span className="truncate px-2">{hof.name}</span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-[13px] leading-[18px] text-green-700">
              {countsForHint[locale]}
            </p>
          </section>
        )}
      </div>
    </BottomSheet>
  );
};
