'use client';

import { SetHeaderActions } from '@/components/header/header-actions';
import { ShareLinkButton } from '@/components/ui/buttons/share-link-button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { FactRow } from '@/components/ui/fact-row';
import { SectionLabel } from '@/components/ui/section-label';
import { Skeleton } from '@/components/ui/skeleton';
import { environmentVariables } from '@/config/environment-variables';
import {
  FigurePortrait,
  NewPill,
  StoryAccessGate,
  StoryParagraphs,
} from '@/features/story/components/story-parts';
import { fillStoryText, storyTexts } from '@/features/story/story-texts';
import type { StoryChallengeSummary } from '@/features/story/types';
import {
  formatStoryDay,
  formatStoryMoment,
  formatStoryTime,
  storyDayParts,
} from '@/features/story/utils/story-time';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import { useTRPC } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { campClockOf } from '@/utils/camp-clock';
import { cn } from '@/utils/tailwindcss-override';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  Clock,
  EyeOff,
  Info,
  MapPin,
  Trophy,
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type React from 'react';

const Loading: React.FC = () => (
  <div className="space-y-3">
    <Skeleton className="h-11 w-full rounded-xl" />
    <Skeleton className="h-32 w-full rounded-[14px]" />
    <Skeleton className="h-32 w-full rounded-[14px]" />
  </div>
);

/** "Bis 18:00" on the challenge's own day, the day and the time on another one. */
const untilLabel = (challenge: StoryChallengeSummary, locale: Locale): string | undefined => {
  if (challenge.until === undefined) return undefined;
  if (challenge.isOver) return storyTexts.isOver[locale];
  const sameDay = campClockOf(new Date(challenge.until)).dayKey === challenge.dayKey;
  return fillStoryText(storyTexts.until[locale], {
    time: sameDay
      ? formatStoryTime(challenge.until, locale)
      : formatStoryMoment(challenge.until, locale),
  });
};

const ChallengeCard: React.FC<{ challenge: StoryChallengeSummary; locale: Locale }> = ({
  challenge,
  locale,
}) => {
  const until = untilLabel(challenge, locale);
  return (
    <Link
      href={`/app/challenges?id=${challenge.id}`}
      className={cn(
        'focus-visible:focus-surface border-line block rounded-[14px] border bg-white px-3.5 py-3',
        challenge.isOver && 'opacity-70',
      )}
    >
      {challenge.from !== undefined && (
        <span className="mb-2 flex items-center gap-2.5 text-[13px] leading-[17px] text-green-700">
          <FigurePortrait figure={challenge.from} className="size-[34px] text-[12px]" />
          <span>
            {fillStoryText(storyTexts.challengeFrom[locale], { name: challenge.from.name })}
          </span>
        </span>
      )}
      <span className="font-heading text-heading block text-[17px] leading-snug font-extrabold">
        {challenge.title}
      </span>
      {(until !== undefined || challenge.isNew) && (
        <span className="mt-2 flex items-center gap-2">
          {until !== undefined && (
            <span className="bg-chip inline-flex h-6 items-center gap-1 rounded-md px-2 text-xs font-semibold text-green-900">
              <Clock className="size-3" aria-hidden />
              {until}
            </span>
          )}
          {challenge.isNew && <NewPill locale={locale} />}
        </span>
      )}
    </Link>
  );
};

/** The day the list opens on: today if it has challenges, else the latest day before it. */
const initialDayOf = (dayKeys: string[]): string | undefined => {
  const today = campClockOf(new Date()).dayKey;
  if (dayKeys.includes(today)) return today;
  return [...dayKeys].reverse().find((dayKey) => dayKey < today) ?? dayKeys.at(-1);
};

const ChallengeList: React.FC<{ locale: Locale; day: string | null }> = ({ locale, day }) => {
  const trpc = useTRPC();
  const { data, isError } = useQuery(trpc.story.getChallengeList.queryOptions());

  if (data === undefined) {
    return isError ? (
      <EmptyState icon={AlertTriangle} title={storyTexts.loadFailed[locale]} />
    ) : (
      <Loading />
    );
  }
  if (data.access !== 'ok') return <StoryAccessGate access={data.access} locale={locale} />;

  const dayKeys = data.days.map(({ dayKey }) => dayKey);
  const shownDay = day !== null && dayKeys.includes(day) ? day : initialDayOf(dayKeys);
  const challenges = data.days.find(({ dayKey }) => dayKey === shownDay)?.challenges ?? [];

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-heading text-[28px] leading-[1.15] font-extrabold">
        {storyTexts.challenges[locale]}
      </h1>
      {dayKeys.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title={storyTexts.noChallenges[locale]}
          description={storyTexts.noChallengesText[locale]}
        />
      ) : (
        <>
          <nav
            aria-label={storyTexts.chooseDay[locale]}
            className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1"
          >
            {dayKeys.map((dayKey) => {
              const parts = storyDayParts(dayKey, locale);
              const isChosen = dayKey === shownDay;
              return (
                <Link
                  key={dayKey}
                  href={`/app/challenges?day=${dayKey}`}
                  replace
                  aria-current={isChosen ? 'date' : undefined}
                  className={cn(
                    'focus-visible:focus-surface flex h-11 shrink-0 snap-start items-center rounded-xl px-4 text-[15px] font-semibold',
                    isChosen ? 'bg-conveniat-green text-white' : 'bg-quiet text-green-700',
                  )}
                >
                  {parts.weekday} {parts.day}
                </Link>
              );
            })}
          </nav>
          <p className="bg-quiet flex items-start gap-2 rounded-[14px] px-3.5 py-3 text-[13px] leading-[19px] text-green-700">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            {storyTexts.confirmHint[locale]}
          </p>
          <div className="space-y-2.5">
            {challenges.map((challenge) => (
              <ChallengeCard key={challenge.id} challenge={challenge} locale={locale} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const ChallengeScreen: React.FC<{ id: string; locale: Locale }> = ({ id, locale }) => {
  const trpc = useTRPC();
  const { data, isError } = useQuery(trpc.story.getChallenge.queryOptions({ id }));

  if (data === undefined) {
    return isError ? (
      <EmptyState icon={AlertTriangle} title={storyTexts.loadFailed[locale]} />
    ) : (
      <Loading />
    );
  }
  if (data.access !== 'ok') return <StoryAccessGate access={data.access} locale={locale} />;
  const challenge = data.challenge;
  const until = challenge === null ? undefined : untilLabel(challenge, locale);

  return (
    <div className="space-y-5">
      <SetHeaderActions>
        {challenge !== null && (
          <ShareLinkButton
            url={`${environmentVariables.NEXT_PUBLIC_APP_HOST_URL}/app/challenges?id=${challenge.id}`}
            title={challenge.title}
            locale={locale}
          />
        )}
      </SetHeaderActions>
      <Link
        href="/app/challenges"
        className="focus-visible:focus-surface hover:bg-quiet -ml-2 inline-flex h-11 items-center gap-1 rounded-xl px-2 text-[15px] font-semibold text-green-700"
      >
        <ChevronLeft className="size-5" aria-hidden />
        {storyTexts.challenges[locale]}
      </Link>
      {challenge === null ? (
        <EmptyState
          icon={EyeOff}
          title={storyTexts.notFound[locale]}
          description={storyTexts.notFoundText[locale]}
        />
      ) : (
        <>
          <header className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold tracking-[0.08em] text-green-700 uppercase">
              <span className="bg-conveniat-green size-2 rounded-full" />
              {storyTexts.challenges[locale]}
              {challenge.dayKey !== undefined && ` · ${formatStoryDay(challenge.dayKey, locale)}`}
            </div>
            <h1 className="font-heading text-heading text-[28px] leading-[1.15] font-extrabold text-balance">
              {challenge.title}
            </h1>
          </header>

          {challenge.from !== undefined && (
            <figure className="bg-tint border-tint-line flex gap-3 rounded-[14px] border px-3.5 py-3">
              <FigurePortrait figure={challenge.from} className="size-11 text-[15px]" />
              <div className="min-w-0">
                <figcaption className="text-[13px] font-semibold text-green-700">
                  {challenge.from.name}
                </figcaption>
                {challenge.message !== '' && (
                  <blockquote className="mt-0.5 text-[15px] leading-normal text-green-900 italic">
                    {challenge.message}
                  </blockquote>
                )}
              </div>
            </figure>
          )}

          <Card>
            {until !== undefined && <FactRow icon={Clock} title={until} />}
            {challenge.confirmAt !== undefined && (
              <FactRow
                icon={MapPin}
                title={`${storyTexts.confirmAt[locale]}: ${challenge.confirmAt.title}`}
                sub={storyTexts.showOnMap[locale]}
                href={`/app/map?locationId=${challenge.confirmAt.id}`}
              />
            )}
            {challenge.scheduleEntries.map((entry) => (
              <FactRow
                key={entry.id}
                icon={CalendarDays}
                title={entry.title}
                sub={entry.time}
                href={`/app/schedule?id=${entry.id}`}
              />
            ))}
            {challenge.from !== undefined && (
              <FactRow
                icon={BookOpen}
                title={challenge.from.name}
                sub={storyTexts.figureInStory[locale]}
                href={`/app/story?figure=${challenge.from.id}`}
              />
            )}
          </Card>

          <section className="space-y-2">
            <SectionLabel>{storyTexts.task[locale]}</SectionLabel>
            <StoryParagraphs text={challenge.task} />
          </section>
        </>
      )}
    </div>
  );
};

/**
 * The challenges for Leitende at `/app/challenges`: by day, and one by `?id=`. Done in person at
 * the Infopoint; the app only announces them.
 */
export const ChallengesView: React.FC = () => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const searchParameters = useSearchParams();
  const id = searchParameters.get('id');
  if (id !== null && id !== '') return <ChallengeScreen id={id} locale={locale} />;
  return (
    <>
      <SetHeaderActions />
      <ChallengeList locale={locale} day={searchParameters.get('day')} />
    </>
  );
};
