'use client';

import { trpc } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Users } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import type React from 'react';

interface ParticipantListProperties {
  courseId: string;
}

const labels = {
  title: {
    de: 'Teilnehmer',
    en: 'Participants',
    fr: 'Participants',
  },
  noParticipants: {
    de: 'Noch keine Teilnehmer',
    en: 'No participants yet',
    fr: 'Pas encore de participants',
  },
  hiddenList: {
    de: 'Die Teilnehmerliste ist verborgen',
    en: 'Participant list is hidden',
    fr: 'La liste des participants est masquée',
  },
} as const;

/**
 * Component to display the list of enrolled participants for a workshop.
 * Shows participants if the workshop has enrollment enabled and the list is not hidden.
 */
export const ParticipantList: React.FC<ParticipantListProperties> = ({ courseId }) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const { data: status, isLoading } = trpc.schedule.getCourseStatus.useQuery({ courseId });

  // Don't show anything if loading or enrollment not enabled
  if (isLoading || !status?.enableEnrolment) {
    return;
  }

  // Check if participant list should be hidden (and user is not admin)
  if (status.hideList && !status.isAdmin) {
    return;
  }

  const participants = status.participants;

  return (
    <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold tracking-wider text-gray-500 uppercase">
        <Users className="h-4 w-4" />
        {labels.title[locale]} ({status.enrolledCount})
      </h3>

      {participants.length === 0 ? (
        <p className="text-sm text-gray-400 italic">{labels.noParticipants[locale]}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {participants.map((p) => (
            <div
              key={p.uuid}
              className={cn(
                'flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-700',
              )}
            >
              <div className="bg-conveniat-green h-2 w-2 rounded-full" />
              {p.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
