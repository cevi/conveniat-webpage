'use client';

import { FactRow } from '@/components/ui/fact-row';
import { getURLForLinkField } from '@/features/payload-cms/payload-cms/utils/link-field-logic';
import type { CampScheduleEntry } from '@/features/payload-cms/payload-types';
import { programmeLabels } from '@/features/schedule/constants/schedule-labels';
import { useLeaderAccess } from '@/hooks/use-leader-access';
import { useTRPC } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, FileText, Swords } from 'lucide-react';
import type React from 'react';

/**
 * The rows of a block's facts that lead further: to the page the editors linked, for everybody,
 * and to the story of the block and its challenges, for Leitende once they have appeared. The
 * story is the story router's answer, which leaves out anything still to come.
 */
export const ScheduleStoryRows: React.FC<{
  /** the ids of the block's slots; the story may link any of them */
  entryIds: string[];
  /** read defensively: a persisted entry may come from before the field existed */
  furtherPage: CampScheduleEntry['furtherPage'] | undefined;
  furtherPageLabel: string | null | undefined;
  locale: Locale;
}> = ({ entryIds, furtherPage, furtherPageLabel, locale }) => {
  const trpc = useTRPC();
  const isLeader = useLeaderAccess(entryIds.length > 0);
  const { data } = useQuery(
    trpc.story.getStoryOfScheduleEntries.queryOptions(
      { entryIds },
      {
        enabled: isLeader && entryIds.length > 0,
        // the story appears after its block: asked again while the block stays open, see
        // storyQueryOptions in the story feature
        staleTime: 60 * 1000,
        refetchInterval: 5 * 60 * 1000,
        refetchOnWindowFocus: true,
      },
    ),
  );

  const pageHref =
    typeof furtherPage === 'object' && furtherPage !== null
      ? getURLForLinkField(
          { type: 'reference', reference: { relationTo: 'generic-page', value: furtherPage } },
          locale,
        )
      : undefined;

  return (
    <>
      {(data?.events ?? []).map((event) => (
        <FactRow
          key={event.id}
          icon={BookOpen}
          title={event.title}
          sub={programmeLabels.storySoFar[locale]}
          href={`/app/story?event=${event.id}`}
        />
      ))}
      {(data?.challenges ?? []).map((challenge) => (
        <FactRow
          key={challenge.id}
          icon={Swords}
          title={challenge.title}
          sub={programmeLabels.challenge[locale]}
          href={`/app/challenges?id=${challenge.id}`}
        />
      ))}
      {pageHref !== undefined && (
        <FactRow
          icon={FileText}
          title={
            furtherPageLabel !== null &&
            furtherPageLabel !== undefined &&
            furtherPageLabel.trim() !== ''
              ? furtherPageLabel
              : programmeLabels.moreAboutIt[locale]
          }
          sub={programmeLabels.openPage[locale]}
          href={pageHref}
        />
      )}
    </>
  );
};
