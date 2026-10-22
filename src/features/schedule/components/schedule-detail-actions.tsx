'use client';

import { Button } from '@/components/ui/buttons/button';
import { ReminderButton, ReminderHint } from '@/features/schedule/components/reminder-button';
import { StartsInPill } from '@/features/schedule/components/starts-in-pill';
import { reminderLabels } from '@/features/schedule/constants/reminder-labels';
import type { Locale } from '@/types/types';
import { Route } from 'lucide-react';
import Link from 'next/link';
import type React from 'react';

/**
 * What one does with a block before it starts: how soon it does, the way there, and a reminder.
 * The way opens the Karte at the block's place with the user's own position switched on.
 */
export const ScheduleDetailActions: React.FC<{
  entryId: string;
  timeslot: { date: string; time: string };
  locationId: string | undefined;
  locale: Locale;
}> = ({ entryId, timeslot, locationId, locale }) => (
  <div className="space-y-3">
    <StartsInPill timeslot={timeslot} locale={locale} />
    <div className="flex gap-2.5">
      {locationId !== undefined && (
        <Button asChild variant="primary" size="touch" className="flex-1">
          <Link href={`/app/map?locationId=${locationId}&locate=1`}>
            <Route aria-hidden="true" />
            {reminderLabels.showWay[locale]}
          </Link>
        </Button>
      )}
      <ReminderButton entryId={entryId} entryKind="program" locale={locale} className="flex-1" />
    </div>
    <ReminderHint entryId={entryId} entryKind="program" locale={locale} />
  </div>
);
