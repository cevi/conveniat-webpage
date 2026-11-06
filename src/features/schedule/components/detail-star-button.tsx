'use client';
import { ProgrammeStarButton } from '@/features/schedule/components/programme-star-button';
import { useStar } from '@/hooks/use-star';
import { useTRPC } from '@/trpc/client';
import type React from 'react';
import { useMemo } from 'react';

import { useQuery } from '@tanstack/react-query';

/** The star on a block's page, locked while the user is enrolled in it. */
export const DetailStarButton: React.FC<{ entryId: string; className?: string }> = ({
  entryId,
  className,
}) => {
  const trpc = useTRPC();
  const { isStarred, toggleStar } = useStar();

  const { data: myEnrollments } = useQuery(
    trpc.schedule.getMyEnrollments.queryOptions(undefined, {
      staleTime: 1000 * 60 * 5,
    }),
  );
  const enrolledIds = useMemo(() => new Set(myEnrollments ?? []), [myEnrollments]);

  return (
    <ProgrammeStarButton
      entryId={entryId}
      isStarred={isStarred(entryId)}
      onToggle={() => toggleStar(entryId)}
      isLocked={enrolledIds.has(entryId)}
      className={className}
    />
  );
};
