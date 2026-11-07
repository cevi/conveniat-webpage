'use client';

import { Card } from '@/components/ui/card';
import { IconTile } from '@/components/ui/icon-tile';
import { ListRow } from '@/components/ui/list-row';
import { SectionLabel } from '@/components/ui/section-label';
import { FigurePortrait, NewPill } from '@/features/story/components/story-parts';
import { fillStoryText, storyTexts } from '@/features/story/story-texts';
import { formatStoryTime } from '@/features/story/utils/story-time';
import { useTRPC } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, ScrollText, Trophy } from 'lucide-react';
import type React from 'react';

/**
 * Home for a Leitende/r: the challenges still open and the newest event of the story, while it
 * is new. Nothing at all for everybody else, and nothing while there is nothing to show.
 */
export const StoryHighlightsCard: React.FC<{ locale: Locale }> = ({ locale }) => {
  const trpc = useTRPC();
  const { data } = useQuery(
    trpc.story.getStoryHighlights.queryOptions(undefined, { staleTime: 60 * 1000 }),
  );
  // read defensively: a persisted answer may come from an older release
  const challenges = data?.openChallenges ?? [];
  const latestEvent = data?.latestEvent;
  if (challenges.length === 0 && latestEvent === undefined) return <></>;

  return (
    <section className="space-y-2">
      <SectionLabel>{storyTexts.story[locale]}</SectionLabel>
      <Card as="ul" divided>
        {challenges.map((challenge) => (
          <li key={challenge.id}>
            <ListRow href={`/app/challenges?id=${challenge.id}`}>
              {challenge.from === undefined ? (
                <IconTile icon={Trophy} />
              ) : (
                <FigurePortrait figure={challenge.from} className="size-[38px] text-[14px]" />
              )}
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-bold tracking-[0.08em] text-green-700 uppercase">
                  {storyTexts.challengeToday[locale]}
                </span>
                <span className="block truncate text-[15px] leading-5 font-semibold text-green-900">
                  {challenge.title}
                </span>
                {(challenge.from !== undefined || challenge.until !== undefined) && (
                  <span className="block truncate text-[13px] leading-[18px] text-green-700">
                    {[
                      challenge.from?.name,
                      challenge.until === undefined
                        ? undefined
                        : fillStoryText(storyTexts.until[locale], {
                            time: formatStoryTime(challenge.until, locale),
                          }),
                    ]
                      .filter((part) => part !== undefined)
                      .join(' · ')}
                  </span>
                )}
              </span>
              <ChevronRight className="size-5 shrink-0 text-green-500" aria-hidden />
            </ListRow>
          </li>
        ))}
        {latestEvent !== undefined && (
          <li>
            <ListRow href={`/app/story?event=${latestEvent.id}`}>
              <IconTile icon={ScrollText} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-[11px] font-bold tracking-[0.08em] text-green-700 uppercase">
                  {storyTexts.newInStory[locale]}
                  <NewPill locale={locale} />
                </span>
                <span className="block truncate text-[15px] leading-5 font-semibold text-green-900">
                  {latestEvent.title}
                </span>
              </span>
              <ChevronRight className="size-5 shrink-0 text-green-500" aria-hidden />
            </ListRow>
          </li>
        )}
      </Card>
    </section>
  );
};
