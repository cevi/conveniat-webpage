'use client';

import { trpc } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Users } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import type React from 'react';

interface CourseStatus {
  enrolledCount: number;
  isAdmin: boolean;
  /**
   * Organiser-ship of this entry. Independent of any role: an organiser of a workshop or a
   * helper shift needs no admin-panel access. Optional so a status still held in the persisted
   * client cache from before this field existed falls back to the `isAdmin` alias.
   */
  isOrganiser?: boolean;
  enableEnrolment: boolean | null | undefined;
  hideList: boolean | null | undefined;
  participants: { uuid: string; name: string }[];
}

interface ParticipantListProperties {
  courseId: string;
  courseStatus?: CourseStatus | undefined;
  /**
   * Which collection `courseId` belongs to. Only consulted for a standalone fetch - it picks
   * between the two routers, which expose the same roster under different names because the
   * enrolment lives in one `Enrollment` table but the course itself does not.
   */
  courseType?: 'program' | 'shift';
  /**
   * `card` stands on its own on the workshop detail page; `inline` is a section divider for
   * surfaces that already sit inside a card, such as the helper portal's shift cards, where a
   * second white panel on white would only draw a box around nothing.
   */
  variant?: 'card' | 'inline';
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
  shiftTitle: {
    de: 'Angemeldete Helfende',
    en: 'Enrolled helpers',
    fr: 'Helpers inscrits',
  },
  noShiftParticipants: {
    de: 'Noch keine Helfenden angemeldet',
    en: 'No helpers enrolled yet',
    fr: 'Aucun helper inscrit',
  },
} as const;

/**
 * Roster of the users enrolled in a workshop or helper shift, for the organisers of it.
 *
 * The server decides both halves of that - it only fills `participants` for an organiser
 * of a course whose "Teilnehmerliste ausblenden" is off - so the guards below are there to
 * keep the component from rendering an empty shell on a surface it does not belong on.
 */
export const ParticipantList: React.FC<ParticipantListProperties> = ({
  courseId,
  courseStatus,
  courseType = 'program',
  variant = 'card',
}) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const isShift = courseType === 'shift';

  // The detail views already hold the status; only fetch when rendered standalone. Both
  // queries are declared unconditionally and gated through `enabled` - the disabled one never
  // reaches the network, and the helper portal's own status query already holds the answer
  // under the same key, so the shift branch resolves from cache rather than a second request.
  const { data: fetchedCourseStatus, isLoading: isLoadingCourse } =
    trpc.schedule.getCourseStatus.useQuery(
      { courseId },
      {
        enabled: courseStatus === undefined && !isShift,
        staleTime: 1000 * 60 * 5,
        // see `schedule-detail-view`: organiser-ship changes in the CMS, never through a
        // mutation here, so a persisted status would pin `isAdmin` for days.
        refetchOnMount: 'always',
      },
    );

  const { data: fetchedShiftStatus, isLoading: isLoadingShift } =
    trpc.shifts.getShiftStatus.useQuery(
      { shiftId: courseId },
      {
        enabled: courseStatus === undefined && isShift,
        staleTime: 1000 * 60 * 5,
        refetchOnMount: 'always',
      },
    );

  const status = courseStatus ?? (isShift ? fetchedShiftStatus : fetchedCourseStatus);
  const isLoading = isShift ? isLoadingShift : isLoadingCourse;

  // Don't show anything if loading or enrollment not enabled
  if (isLoading && !status) return;
  if (!status?.enableEnrolment) return;

  // Only the organisers get to see who enrolled, and only while the list is not hidden -
  // then it stays exclusive to the admin panel.
  if (status.isOrganiser !== true && !status.isAdmin) return;
  if (status.hideList === true) return;

  const participants = status.participants;

  const isInline = variant === 'inline';

  return (
    <div
      className={cn(
        'space-y-3',
        isInline
          ? 'mt-4 border-t border-gray-100 pt-3'
          : 'rounded-2xl border border-gray-100 bg-white p-5 shadow-xs',
      )}
    >
      <div className="flex items-center gap-2">
        {!isInline && (
          <div className="bg-conveniat-green/10 text-conveniat-green flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold">
            <Users className="h-4 w-4" />
          </div>
        )}
        <h3
          className={cn(
            'font-heading font-semibold tracking-wider uppercase',
            isInline
              ? 'flex items-center gap-1.5 text-[11px] text-gray-500'
              : 'text-xs text-gray-700',
          )}
        >
          {isInline && <Users className="h-3.5 w-3.5" />}
          {(isShift ? labels.shiftTitle : labels.title)[locale]} ({status.enrolledCount})
        </h3>
      </div>

      {participants.length === 0 ? (
        <p className="font-body text-sm text-gray-400 italic">
          {(isShift ? labels.noShiftParticipants : labels.noParticipants)[locale]}
        </p>
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
