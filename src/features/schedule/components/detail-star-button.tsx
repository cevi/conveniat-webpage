'use client';

import { StarButton } from '@/components/star/star';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/buttons/button';
import { reminderLabels } from '@/features/schedule/constants/reminder-labels';
import { useReminder } from '@/features/schedule/hooks/use-reminder';
import { useStar } from '@/hooks/use-star';
import { trpc } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { useCurrentLocale } from 'next-i18n-router/client';
import type React from 'react';
import { useMemo, useState } from 'react';

interface DetailStarButtonProperties {
  entryId: string;
  className?: string;
}

/**
 * Client component for starring schedule entries from the detail page.
 * Handles enrollment check to determine if the star is locked.
 *
 * Taking the star off a block with a reminder asks whether the reminder goes too: the two are
 * separate, but setting a reminder stars the block, so leaving the reminder behind unasked would
 * keep pushing about a block the user just dropped.
 */
export const DetailStarButton: React.FC<DetailStarButtonProperties> = ({ entryId, className }) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const { isStarred, toggleStar } = useStar();
  const reminder = useReminder(entryId, 'program');
  const [isAsking, setIsAsking] = useState(false);

  // Get enrolled courses to check if this entry is enrolled
  const { data: myEnrollments } = trpc.schedule.getMyEnrollments.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
  });
  const enrolledIds = useMemo(() => new Set(myEnrollments ?? []), [myEnrollments]);
  const isEnrolled = enrolledIds.has(entryId);
  const currentlyStarred = isStarred(entryId);

  const toggle = (id: string): void => {
    if (currentlyStarred && reminder.isOn && !reminder.isAutomatic) {
      setIsAsking(true);
      return;
    }
    toggleStar(id);
  };

  const unstar = (removeReminder: boolean): void => {
    toggleStar(entryId);
    if (removeReminder) reminder.setReminder(false);
    setIsAsking(false);
  };

  return (
    <>
      <StarButton
        id={entryId}
        isStared={currentlyStarred}
        toggleStar={toggle}
        isLocked={isEnrolled}
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
