'use client';

/* eslint-disable import/no-restricted-paths -- the chat dialog is the app's only bottom-anchored alert dialog */
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
import { cn } from '@/utils/tailwindcss-override';
/* eslint-enable import/no-restricted-paths */
import { ChatLinkButton } from '@/components/ui/buttons/chat-link-button';
import { useConflictingEntry } from '@/features/schedule/hooks/use-conflicting-entry';
import {
  formatCampDateTime,
  formatCampDay,
  formatCampTime,
  getTimeslotOverlap,
} from '@/features/schedule/utils/unenrollment-deadline';
import type { Locale, StaticTranslationString } from '@/types/types';
import { AlertTriangle, ArrowDown, Clock, Loader2, Lock } from 'lucide-react';
import type React from 'react';

const localizedConflict: StaticTranslationString = {
  de: 'Zeitkonflikt',
  en: 'Time conflict',
  fr: 'Conflit horaire',
};

const localizedConflictDescription: StaticTranslationString = {
  de: 'Die beiden Einsätze überschneiden sich.',
  en: 'These two shifts overlap.',
  fr: 'Ces deux services se chevauchent.',
};

const localizedAlreadyEnrolledIn: StaticTranslationString = {
  de: 'Angemeldet',
  en: 'Enrolled',
  fr: 'Inscrit',
};

const localizedWouldEnrolIn: StaticTranslationString = {
  de: 'Neu anmelden',
  en: 'Enrol instead',
  fr: 'S’inscrire à la place',
};

const localizedWorkshopTag: StaticTranslationString = {
  de: 'Workshop',
  en: 'Workshop',
  fr: 'Atelier',
};

const localizedSwitchToThis: StaticTranslationString = {
  de: 'Wechseln',
  en: 'Switch',
  fr: 'Changer',
};

const localizedSwitching: StaticTranslationString = {
  de: 'Wechseln...',
  en: 'Switching...',
  fr: 'Changement...',
};

const localizedCancel: StaticTranslationString = {
  de: 'Abbrechen',
  en: 'Cancel',
  fr: 'Annuler',
};

const localizedClose: StaticTranslationString = {
  de: 'Schliessen',
  en: 'Close',
  fr: 'Fermer',
};

/**
 * The deadline sits on the entry it belongs to rather than in a paragraph of its own.
 *
 * Naming the shift in prose - "Von «Auf- und Abbau Bühne» kannst du dich nicht mehr abmelden" -
 * was only necessary because the constraint was floating free of both entries. Attached to the
 * one it applies to, a lock and a timestamp say the same thing in a line.
 */
const localizedWithdrawalClosedShort: StaticTranslationString = {
  de: 'Frist abgelaufen',
  en: 'Deadline passed',
  fr: 'Délai dépassé',
};

const localizedOverlapLabel: StaticTranslationString = {
  de: 'Überschneidung',
  en: 'Overlap',
  fr: 'Chevauchement',
};

const localizedContactOrganiser: StaticTranslationString = {
  de: 'Organisator kontaktieren',
  en: 'Contact the organiser',
  fr: 'Contacter l’organisateur',
};

const localizedSwitchBlockedHint: StaticTranslationString = {
  de: 'Wechsel nicht möglich. Melde dich bei den Organisatoren.',
  en: 'Switching is not possible. Contact the organisers.',
  fr: 'Changement impossible. Contacte les organisateurs.',
};

export interface ConflictParty {
  title: string;
  timeslot?: { date: string; time: string } | undefined;
}

/**
 * One side of the conflict, labelled with what it is to the helper.
 *
 * The label is the whole point: the dialog used to show a single unlabelled name, which read
 * equally well as "the shift you are joining" and "the shift you are already on".
 */
const ConflictEntry: React.FC<{
  label: string;
  /** Only worth saying when it is not the obvious one - both sides are shifts by default. */
  tag?: string | undefined;
  entry: ConflictParty;
  locale: Locale;
  isMuted?: boolean;
  note?: React.ReactNode;
}> = ({ label, tag, entry, locale, isMuted = false, note }) => (
  <div
    className={
      isMuted
        ? 'bg-quiet w-full rounded-xl p-3'
        : 'border-tint-line bg-tint w-full rounded-xl border p-3'
    }
  >
    <div className="text-[11px] font-bold tracking-[0.08em] text-green-700 uppercase">
      {label}
      {tag !== undefined && ` · ${tag}`}
    </div>
    <div className="mt-0.5 font-semibold text-green-900">{entry.title}</div>
    {entry.timeslot !== undefined && (
      <div className="mt-1 flex items-center gap-1.5 text-[13px] text-green-700 tabular-nums">
        <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>
          {formatCampDay(entry.timeslot.date, locale)} · {entry.timeslot.time}
        </span>
      </div>
    )}
    {note}
  </div>
);

/**
 * The dialog a helper gets when the shift they tapped overlaps one they are already on.
 *
 * It answers three questions the previous version left open: which entry is which, when each of
 * them runs - a time conflict with no times on screen - and, when the switch is refused, which
 * of the two is the one that can no longer be left.
 */
export const ShiftConflictDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflictType: 'workshop' | 'shift';
  /** The entry the helper is already enrolled in, as the server named it. */
  conflictingName: string;
  conflictingId: string;
  /** The shift whose card this dialog belongs to. */
  target: ConflictParty;
  isSwitchBlocked: boolean;
  /** The deadline that has already passed, when it is known. */
  blockedDeadline?: string | null | undefined;
  isSwitching: boolean;
  onSwitch: () => void;
  locale: Locale;
}> = ({
  open,
  onOpenChange,
  conflictType,
  conflictingName,
  conflictingId,
  target,
  isSwitchBlocked,
  blockedDeadline,
  isSwitching,
  onSwitch,
  locale,
}) => {
  const conflictingEntry = useConflictingEntry(open ? conflictingId : undefined, conflictType);

  // both sides are helper shifts unless the dialog says otherwise, so only a workshop is labelled
  const conflictingTag = conflictType === 'shift' ? undefined : localizedWorkshopTag[locale];

  const overlap =
    conflictingEntry === undefined || target.timeslot === undefined
      ? undefined
      : getTimeslotOverlap(conflictingEntry.timeslot, target.timeslot);

  /**
   * The organiser of the entry that cannot be left. When switching is refused, this is the only
   * person who can still take the helper off it, so the dialog stops being a dead end.
   */
  const contactOrganiser = conflictingEntry?.organisers[0];

  return (
    <ChatAlertDialog open={open} onOpenChange={onOpenChange}>
      <ChatAlertDialogContent>
        <ChatAlertDialogHeader>
          <ChatAlertDialogTitle>{localizedConflict[locale]}</ChatAlertDialogTitle>
          <ChatAlertDialogDescription>
            {localizedConflictDescription[locale]}
          </ChatAlertDialogDescription>
        </ChatAlertDialogHeader>

        <div className="flex flex-col items-center gap-1">
          <ConflictEntry
            label={localizedAlreadyEnrolledIn[locale]}
            tag={conflictingTag}
            entry={{ title: conflictingName, timeslot: conflictingEntry?.timeslot }}
            locale={locale}
            isMuted
            note={
              isSwitchBlocked ? (
                <div className="text-danger-text mt-1 flex items-center gap-1.5 text-[13px]">
                  <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>
                    {localizedWithdrawalClosedShort[locale]}
                    {blockedDeadline != undefined &&
                      `: ${formatCampDateTime(blockedDeadline, locale)}`}
                  </span>
                </div>
              ) : undefined
            }
          />

          <ArrowDown className="-my-0.5 h-4 w-4 shrink-0 text-green-500" aria-hidden="true" />

          <ConflictEntry
            label={localizedWouldEnrolIn[locale]}
            entry={target}
            locale={locale}
            isMuted={isSwitchBlocked}
          />

          {/*
            One warning rather than two: the overlap said what collides and a paragraph under it
            said what follows, in separate boxes a line apart. They are one thought.
          */}
          {(overlap !== undefined || isSwitchBlocked) && (
            <div
              className={cn(
                'mt-1 w-full rounded-xl px-3 py-2 text-sm',
                // a switch that is blocked is a problem; an overlap alone is something to know
                isSwitchBlocked ? 'bg-danger-soft text-danger-text' : 'bg-quiet text-green-900',
              )}
            >
              {overlap !== undefined && (
                <span className="flex items-center gap-1.5 font-medium">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {localizedOverlapLabel[locale]} {formatCampTime(overlap.start, locale)} –{' '}
                  {formatCampTime(overlap.end, locale)}
                </span>
              )}
              {isSwitchBlocked && (
                <span className="mt-0.5 block">{localizedSwitchBlockedHint[locale]}</span>
              )}
            </div>
          )}
        </div>

        <ChatAlertDialogFooter className="gap-3 sm:gap-0">
          {isSwitchBlocked && contactOrganiser !== undefined && (
            <ChatLinkButton
              userId={contactOrganiser.id}
              label={localizedContactOrganiser[locale]}
              className="border-rail hover:bg-quiet h-11 w-full bg-white text-green-900 hover:text-green-900"
            />
          )}
          {!isSwitchBlocked && (
            <ChatAlertDialogAction
              className="bg-conveniat-green w-full text-white hover:bg-green-700"
              onClick={(event: React.MouseEvent) => {
                event.preventDefault();
                onSwitch();
              }}
              disabled={isSwitching}
            >
              {isSwitching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {localizedSwitching[locale]}
                </>
              ) : (
                localizedSwitchToThis[locale]
              )}
            </ChatAlertDialogAction>
          )}
          {/* with nothing left to confirm, the way out stops being a cancel and becomes a close */}
          <ChatAlertDialogCancel disabled={isSwitching} className="w-full">
            {isSwitchBlocked ? localizedClose[locale] : localizedCancel[locale]}
          </ChatAlertDialogCancel>
        </ChatAlertDialogFooter>
      </ChatAlertDialogContent>
    </ChatAlertDialog>
  );
};
