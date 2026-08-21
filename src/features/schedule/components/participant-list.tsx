'use client';

import { trpc } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { Users } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import type React from 'react';

interface CourseStatus {
  enrolledCount: number;
  isAdmin: boolean;
  enableEnrolment: boolean | null | undefined;
  hideList: boolean | null | undefined;
  participants: { uuid: string; name: string }[];
}

interface ParticipantListProperties {
  courseId: string;
  courseStatus?: CourseStatus | undefined;
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
} as const;

/**
 * Roster of the users enrolled in a workshop, for the organisers of that workshop.
 *
 * The server decides both halves of that - it only fills `participants` for an organiser
 * of a course whose "Teilnehmerliste ausblenden" is off - so the guards below are there to
 * keep the component from rendering an empty shell on a surface it does not belong on.
 */
export const ParticipantList: React.FC<ParticipantListProperties> = ({
  courseId,
  courseStatus,
}) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;

  // The detail views already hold the status; only fetch when rendered standalone.
  const { data: fetchedStatus, isLoading } = trpc.schedule.getCourseStatus.useQuery(
    { courseId },
    { enabled: courseStatus === undefined, staleTime: 1000 * 60 * 5 },
  );

  const status = courseStatus ?? fetchedStatus;

  // Don't show anything if loading or enrollment not enabled
  if (isLoading && !status) return;
  if (!status?.enableEnrolment) return;

  // Only the organisers of the workshop get to see who enrolled, and only while the
  // organiser has not hidden the list - then it stays exclusive to the admin panel.
  if (!status.isAdmin) return;
  if (status.hideList === true) return;

  const participants = status.participants;

  return (
    <div className="space-y-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-xs">
      <div className="flex items-center gap-2">
        <div className="bg-conveniat-green/10 text-conveniat-green flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold">
          <Users className="h-4 w-4" />
        </div>
        <h3 className="font-heading text-xs font-semibold tracking-wider text-gray-700 uppercase">
          {labels.title[locale]} ({status.enrolledCount})
        </h3>
      </div>

      {participants.length === 0 ? (
        <p className="font-body text-sm text-gray-400 italic">{labels.noParticipants[locale]}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {participants.map((p) => (
            <div
              key={p.uuid}
              className="font-body flex items-center gap-2 rounded-full border border-gray-100 bg-gray-50/60 px-3 py-1.5 text-sm text-gray-700"
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
