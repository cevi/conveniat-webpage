'use client';

import { StarButton } from '@/components/star/star';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/buttons/button';
import { reminderLabels } from '@/features/schedule/constants/reminder-labels';
import { useReminder } from '@/features/schedule/hooks/use-reminder';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { useCurrentLocale } from 'next-i18n-router/client';
import type React from 'react';
import { useState } from 'react';

/**
 * The star of a block, on its card in the Programm and on its page.
 *
 * Taking the star off a block with a reminder asks whether the reminder goes too: the two are
 * separate, but setting a reminder stars the block, so leaving the reminder behind unasked would
 * keep pushing about a block the user just dropped.
 */
export const ProgrammeStarButton: React.FC<{
  /** the slot the star stands for, whose reminder is asked about */
  entryId: string;
  isStarred: boolean;
  /** stars or unstars the block, once the user has answered about the reminder */
  onToggle: () => void;
  /** an enrolled block stays a favourite */
  isLocked: boolean;
  className?: string | undefined;
}> = ({ entryId, isStarred, onToggle, isLocked, className }) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const reminder = useReminder(entryId, 'program');
  const [isAsking, setIsAsking] = useState(false);

  const toggle = (): void => {
    if (isStarred && reminder.isOn && !reminder.isAutomatic) {
      setIsAsking(true);
      return;
    }
    onToggle();
  };

  const unstar = (removeReminder: boolean): void => {
    onToggle();
    if (removeReminder) reminder.setReminder(false);
    setIsAsking(false);
  };

  return (
    <>
      <StarButton
        id={entryId}
        isStared={isStarred}
        toggleStar={toggle}
        isLocked={isLocked}
        className={className}
      />
      <BottomSheet
        open={isAsking}
        onOpenChange={setIsAsking}
        title={reminderLabels.removeReminderTooQuestion[locale]}
      >
        <p className="text-[15px] text-green-700">
          {reminderLabels.removeReminderTooDescription[locale]}
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <Button
            type="button"
            variant="outlined"
            size="touch"
            className="border-danger-line text-danger-text hover:bg-danger-soft"
            onClick={() => unstar(true)}
          >
            {reminderLabels.yesRemove[locale]}
          </Button>
          <Button type="button" variant="quiet" size="touch" onClick={() => unstar(false)}>
            {reminderLabels.keep[locale]}
          </Button>
        </div>
      </BottomSheet>
    </>
  );
};
