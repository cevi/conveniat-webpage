'use client';

import { StarButton } from '@/components/star/star';
import { useStar } from '@/hooks/use-star';
import { trpc } from '@/trpc/client';
import type React from 'react';
import { useMemo } from 'react';

interface DetailStarButtonProperties {
  entryId: string;
}

/**
 * Client component for starring schedule entries from the detail page.
 * Handles enrollment check to determine if the star is locked.
 */
export const DetailStarButton: React.FC<DetailStarButtonProperties> = ({ entryId }) => {
  const { isStarred, toggleStar } = useStar();

  // Get enrolled courses to check if this entry is enrolled
  const { data: myEnrollments } = trpc.schedule.getMyEnrollments.useQuery();
  const enrolledIds = useMemo(() => new Set(myEnrollments ?? []), [myEnrollments]);
  const isEnrolled = enrolledIds.has(entryId);
  const currentlyStarred = isStarred(entryId);

  return (
    <StarButton
      id={entryId}
      isStared={currentlyStarred}
      toggleStar={toggleStar}
      isLocked={isEnrolled}
    />
  );
};
