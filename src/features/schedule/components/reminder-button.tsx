'use client';

import { Button } from '@/components/ui/buttons/button';
import { reminderLabels } from '@/features/schedule/constants/reminder-labels';
import type { ReminderEntryKind } from '@/features/schedule/hooks/use-reminder';
import { useReminder } from '@/features/schedule/hooks/use-reminder';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { AlertCircle, Bell, BellRing } from 'lucide-react';
import Link from 'next/link';
import type React from 'react';

/**
 * "Erinnern": a push some minutes before the entry and one at its start, as Einstellungen say.
 * On for whatever the user is enrolled in, and switchable per entry. Absent for a visitor who
 * is not logged in, who has no device to push to.
 */
export const ReminderButton: React.FC<{
  entryId: string;
  entryKind: ReminderEntryKind;
  locale: Locale;
  className?: string;
}> = ({ entryId, entryKind, locale, className }) => {
  const { canRemind, isOn, setReminder, isError } = useReminder(entryId, entryKind);
  if (!canRemind) return <></>;

  const Icon = isOn ? BellRing : Bell;
  return (
    <Button
      type="button"
      variant="outlined"
      size="touch"
      aria-pressed={isOn}
      onClick={() => setReminder(!isOn)}
      className={cn(isError && 'border-danger-line', className)}
    >
      <Icon className={cn(isOn && 'fill-current')} aria-hidden="true" />
      {isOn ? reminderLabels.reminderOn[locale] : reminderLabels.remind[locale]}
    </Button>
  );
};

/**
 * What a reminder needs to arrive, said under the button: a device that receives pushes, and a
 * saved setting. Shows nothing while all is well.
 */
export const ReminderHint: React.FC<{
  entryId: string;
  entryKind: ReminderEntryKind;
  locale: Locale;
}> = ({ entryId, entryKind, locale }) => {
  const { canRemind, isOn, hasPushDevice, isError } = useReminder(entryId, entryKind);
  if (!canRemind) return <></>;

  if (isError) {
    return (
      <p role="alert" className="text-danger-text flex items-start gap-1.5 text-[13px] font-medium">
        <AlertCircle className="mt-px h-4 w-4 shrink-0" aria-hidden="true" />
        {reminderLabels.failed[locale]}
      </p>
    );
  }
  if (!isOn || hasPushDevice !== false) return <></>;
  return (
    <p className="text-[13px] leading-[18px] text-green-700">
      {reminderLabels.pushOff[locale]}{' '}
      <Link href="/app/settings" className="text-conveniat-green font-semibold underline">
        {reminderLabels.pushOffLink[locale]}
      </Link>
    </p>
  );
};
