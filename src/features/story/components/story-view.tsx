'use client';

import { SetHeaderActions } from '@/components/header/header-actions';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { FactRow } from '@/components/ui/fact-row';
import { IconTile } from '@/components/ui/icon-tile';
import { ListRow } from '@/components/ui/list-row';
import { SectionLabel } from '@/components/ui/section-label';
import { segmentClassName, segmentedTrackClassName } from '@/components/ui/segmented-control';
import { Skeleton } from '@/components/ui/skeleton';
import { StoryDetailScreen } from '@/features/story/components/story-detail-screen';
import {
  FigurePortrait,
  NewPill,
  StoryAccessGate,
  StoryParagraphs,
} from '@/features/story/components/story-parts';
import { storyTexts } from '@/features/story/story-texts';
import type {
  StoryChallengeSummary,
  StoryEventSummary,
  StoryFigureListItem,
  StoryFigureSummary,
  StoryOverview,
} from '@/features/story/types';
import { formatStoryDay, storyDayParts } from '@/features/story/utils/story-time';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import type { RouterOutputs } from '@/trpc/client';
import { useTRPC } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  BookOpen,
  CalendarDays,
  ChevronRight,
  EyeOff,
  MapPin,
  ScrollText,
  Trophy,
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type React from 'react';

type Tab = 'events' | 'figures';

const LoadingList: React.FC = () => (
  <div className="space-y-3">
    <Skeleton className="h-11 w-full rounded-xl" />
    <Skeleton className="h-20 w-full rounded-[14px]" />
    <Skeleton className="h-40 w-full rounded-[14px]" />
  </div>
);

const LoadFailed: React.FC<{ locale: Locale }> = ({ locale }) => (
  <EmptyState icon={AlertTriangle} title={storyTexts.loadFailed[locale]} />
);

const NotFound: React.FC<{ locale: Locale }> = ({ locale }) => (
  <EmptyState
    icon={EyeOff}
    title={storyTexts.notFound[locale]}
    description={storyTexts.notFoundText[locale]}
  />
);

/** One event in a list: its day on the left, or a scroll for the backstory. */
const EventRow: React.FC<{ event: StoryEventSummary; locale: Locale }> = ({ event, locale }) => {
  const parts = event.dayKey === undefined ? undefined : storyDayParts(event.dayKey, locale);
  return (
    <li>
      <ListRow href={`/app/story?event=${event.id}`} className="items-start py-3">
        {parts === undefined ? (
          <IconTile icon={ScrollText} />
        ) : (
          <span className="w-[38px] shrink-0 text-center">
            <span className="block text-[11px] font-bold tracking-[0.06em] text-green-700 uppercase">
              {parts.weekday}
            </span>
            <span className="font-heading text-heading block text-[19px] leading-tight font-extrabold">
              {parts.day}
            </span>
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 text-[15px] leading-5 font-semibold text-green-900">
            <span className="min-w-0">{event.title}</span>
            {event.isNew && <NewPill locale={locale} />}
          </span>
          {event.excerpt !== '' && (
            <span className="mt-0.5 line-clamp-2 block text-[13px] leading-[18px] text-green-700">
              {event.excerpt}
            </span>
          )}
        </span>
        <ChevronRight className="mt-2 size-5 shrink-0 text-green-500" aria-hidden />
      </ListRow>
    </li>
  );
};

const FigureCard: React.FC<{ figure: StoryFigureListItem; locale: Locale }> = ({
  figure,
  locale,
}) => (
  <Link
    href={`/app/story?figure=${figure.id}`}
    className="focus-visible:focus-surface border-line relative overflow-hidden rounded-[14px] border bg-white"
  >
    <FigurePortrait figure={figure} square className="aspect-square w-full text-[34px]" />
    {figure.isNew && (
      <span className="absolute top-2 left-2 rounded-full bg-white">
        <NewPill locale={locale} />
      </span>
    )}
    <span className="block px-3 pt-2 pb-3">
      <span className="block truncate text-[15px] leading-5 font-semibold text-green-900">
        {figure.name}
      </span>
      <span className="block truncate text-[13px] leading-[18px] text-green-700">
        {figure.quartierName ?? figure.role}
      </span>
    </span>
  </Link>
);

const OverviewEvents: React.FC<{ overview: StoryOverview; locale: Locale }> = ({
  overview,
  locale,
}) => {
  if (overview.prologue.length === 0 && overview.days.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title={storyTexts.nothingYet[locale]}
        description={storyTexts.nothingYetText[locale]}
      />
    );
  }
  return (
    <>
      {overview.prologue.length > 0 && (
        <section className="space-y-2">
          <SectionLabel>{storyTexts.prologue[locale]}</SectionLabel>
          <Card as="ul" divided>
            {overview.prologue.map((event) => (
              <EventRow key={event.id} event={event} locale={locale} />
            ))}
          </Card>
        </section>
      )}
      {overview.days.length > 0 && (
        <section className="space-y-2">
          <SectionLabel>{storyTexts.campWeek[locale]}</SectionLabel>
          <Card as="ul" divided>
            {/* the newest day first: what Leitende missed is what they look for */}
            {[...overview.days]
              .reverse()
              .flatMap(({ dayKey, events }) =>
                events.map((event) => (
                  <EventRow key={`${dayKey}-${event.id}`} event={event} locale={locale} />
                )),
              )}
          </Card>
        </section>
      )}
    </>
  );
};

const OverviewFigures: React.FC<{ overview: StoryOverview; locale: Locale }> = ({
  overview,
  locale,
}) => {
  if (overview.figureGroups.length === 0) {
    return <EmptyState icon={BookOpen} title={storyTexts.noFigures[locale]} />;
  }
  return (
    <>
      {overview.figureGroups.map((group) => (
        <section key={group.key} className="space-y-2">
          <SectionLabel>{storyTexts[group.key][locale]}</SectionLabel>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {group.figures.map((figure) => (
              <FigureCard key={figure.id} figure={figure} locale={locale} />
            ))}
          </div>
        </section>
      ))}
    </>
  );
};

const StoryOverviewScreen: React.FC<{ tab: Tab; locale: Locale }> = ({ tab, locale }) => {
  const trpc = useTRPC();
  const { data, isError } = useQuery(trpc.story.getStoryOverview.queryOptions());

  if (data === undefined) return isError ? <LoadFailed locale={locale} /> : <LoadingList />;
  if (data.access !== 'ok' || data.overview === null) {
    return <StoryAccessGate access={data.access} locale={locale} />;
  }

  return (
    <div className="space-y-5">
      <h1 className="font-heading text-heading text-[28px] leading-[1.15] font-extrabold">
        {storyTexts.story[locale]}
      </h1>
      <nav className={segmentedTrackClassName} aria-label={storyTexts.story[locale]}>
        {(['events', 'figures'] as const).map((value) => (
          <Link
            key={value}
            href={value === 'events' ? '/app/story' : '/app/story?tab=figuren'}
            replace
            aria-current={tab === value ? 'page' : undefined}
            className={cn(segmentClassName(tab === value), 'flex-1 text-[15px] font-semibold')}
          >
            {storyTexts[value][locale]}
          </Link>
        ))}
      </nav>
      {tab === 'events' && (
        <p className="bg-quiet flex items-start gap-2 rounded-[14px] px-3.5 py-3 text-[13px] leading-[19px] text-green-700">
          <EyeOff className="mt-0.5 size-4 shrink-0" aria-hidden />
          {storyTexts.forLeaders[locale]}
        </p>
      )}
      {tab === 'events' ? (
        <OverviewEvents overview={data.overview} locale={locale} />
      ) : (
        <OverviewFigures overview={data.overview} locale={locale} />
      )}
    </div>
  );
};

/** A row leading to a figure, with its picture. */
export const FigureRow: React.FC<{ figure: StoryFigureSummary; sub?: string }> = ({
  figure,
  sub,
}) => (
  <li>
    <ListRow href={`/app/story?figure=${figure.id}`}>
      <FigurePortrait figure={figure} className="size-[38px] text-[14px]" />
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] leading-5 font-semibold text-green-900">
          {figure.name}
        </span>
        {(sub ?? figure.role) !== '' && (
          <span className="block text-[13px] leading-[18px] text-green-700">
            {sub ?? figure.role}
          </span>
        )}
      </span>
      <ChevronRight className="size-5 shrink-0 text-green-500" aria-hidden />
    </ListRow>
  </li>
);

/** A row leading to a challenge. */
export const ChallengeRow: React.FC<{ challenge: StoryChallengeSummary; locale: Locale }> = ({
  challenge,
  locale,
}) => (
  <li>
    <ListRow href={`/app/challenges?id=${challenge.id}`}>
      <IconTile icon={Trophy} />
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] leading-5 font-semibold text-green-900">
          {challenge.title}
        </span>
        {challenge.dayKey !== undefined && (
          <span className="block text-[13px] leading-[18px] text-green-700">
            {formatStoryDay(challenge.dayKey, locale)}
          </span>
        )}
      </span>
      <ChevronRight className="size-5 shrink-0 text-green-500" aria-hidden />
    </ListRow>
  </li>
);

type EventAnswer = RouterOutputs['story']['getStoryEvent'];
type FigureAnswer = RouterOutputs['story']['getStoryFigure'];

const EventContent: React.FC<{
  data: EventAnswer | undefined;
  isError: boolean;
  locale: Locale;
}> = ({ data, isError, locale }) => {
  if (data === undefined) return isError ? <LoadFailed locale={locale} /> : <LoadingList />;
  if (data.access !== 'ok') return <StoryAccessGate access={data.access} locale={locale} />;
  const event = data.event;

  return (
    <>
      {event === null ? (
        <NotFound locale={locale} />
      ) : (
        <>
          <header className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold tracking-[0.08em] text-green-700 uppercase">
              <span className="bg-conveniat-green size-2 rounded-full" />
              {event.dayKey === undefined
                ? storyTexts.prologue[locale]
                : formatStoryDay(event.dayKey, locale)}
              {event.isNew && <NewPill locale={locale} />}
            </div>
            <h1 className="font-heading text-heading text-[28px] leading-[1.15] font-extrabold text-balance">
              {event.title}
            </h1>
          </header>
          <StoryParagraphs text={event.text} />
          {event.figures.length > 0 && (
            <section className="space-y-2">
              <SectionLabel>{storyTexts.involved[locale]}</SectionLabel>
              <Card as="ul" divided>
                {event.figures.map((figure) => (
                  <FigureRow key={figure.id} figure={figure} />
                ))}
              </Card>
            </section>
          )}
          {(event.scheduleEntries.length > 0 || event.locations.length > 0) && (
            <section className="space-y-2">
              <SectionLabel>{storyTexts.inProgramme[locale]}</SectionLabel>
              <Card>
                {event.scheduleEntries.map((entry) => (
                  <FactRow
                    key={entry.id}
                    icon={CalendarDays}
                    title={entry.title}
                    sub={[
                      entry.dayKey === undefined ? '' : formatStoryDay(entry.dayKey, locale),
                      entry.time,
                    ]
                      .filter((part) => part !== '')
                      .join(' · ')}
                    href={`/app/schedule?id=${entry.id}`}
                  />
                ))}
                {event.locations.map((place) => (
                  <FactRow
                    key={place.id}
                    icon={MapPin}
                    title={place.title}
                    sub={storyTexts.showOnMap[locale]}
                    href={`/app/map?locationId=${place.id}`}
                  />
                ))}
              </Card>
            </section>
          )}
        </>
      )}
    </>
  );
};

const FigureContent: React.FC<{
  data: FigureAnswer | undefined;
  isError: boolean;
  locale: Locale;
}> = ({ data, isError, locale }) => {
  if (data === undefined) return isError ? <LoadFailed locale={locale} /> : <LoadingList />;
  if (data.access !== 'ok') return <StoryAccessGate access={data.access} locale={locale} />;
  const figure = data.figure;

  return (
    <>
      {figure === null ? (
        <NotFound locale={locale} />
      ) : (
        <>
          <FigurePortrait
            figure={figure}
            square
            className="aspect-square w-full max-w-xs rounded-[14px] text-[64px]"
          />
          <header className="space-y-1.5">
            <div className="text-xs font-bold tracking-[0.08em] text-green-700 uppercase">
              {figure.quartierName ?? storyTexts[figure.belongsTo][locale]}
            </div>
            <h1 className="font-heading text-heading text-[28px] leading-[1.15] font-extrabold text-balance">
              {figure.name}
            </h1>
            {figure.role !== '' && (
              <p className="text-[15px] leading-normal text-green-700">{figure.role}</p>
            )}
          </header>

          {figure.knowledge.length > 0 && (
            <section className="space-y-2">
              <SectionLabel>{storyTexts.whatWeKnow[locale]}</SectionLabel>
              <Card divided>
                {figure.knowledge.map((section) => (
                  <div key={section.id} className="space-y-1.5 px-3.5 py-3">
                    <div className="flex items-center gap-2">
                      {section.dayKey !== undefined && (
                        <span className="bg-chip inline-flex h-6 items-center rounded-md px-2 text-xs font-semibold text-green-900">
                          {formatStoryDay(section.dayKey, locale)}
                        </span>
                      )}
                      {section.isNew && <NewPill locale={locale} />}
                    </div>
                    <StoryParagraphs text={section.text} />
                  </div>
                ))}
              </Card>
            </section>
          )}

          {figure.relations.length > 0 && (
            <section className="space-y-2">
              <SectionLabel>{storyTexts.relations[locale]}</SectionLabel>
              <Card as="ul" divided>
                {figure.relations.map((relation) => (
                  <FigureRow
                    key={relation.id}
                    figure={relation.figure}
                    sub={relation.description}
                  />
                ))}
              </Card>
            </section>
          )}

          {(figure.events.length > 0 || figure.challenges.length > 0) && (
            <section className="space-y-2">
              <SectionLabel>{storyTexts.appearsIn[locale]}</SectionLabel>
              <Card as="ul" divided>
                {figure.events.map((event) => (
                  <EventRow key={event.id} event={event} locale={locale} />
                ))}
                {figure.challenges.map((challenge) => (
                  <ChallengeRow key={challenge.id} challenge={challenge} locale={locale} />
                ))}
              </Card>
            </section>
          )}
        </>
      )}
    </>
  );
};

const EventScreen: React.FC<{ id: string; locale: Locale }> = ({ id, locale }) => {
  const trpc = useTRPC();
  const { data, isError } = useQuery(trpc.story.getStoryEvent.queryOptions({ id }));
  const event = data?.access === 'ok' ? data.event : null;
  return (
    <StoryDetailScreen
      fallbackHref="/app/story"
      share={
        event === null ? undefined : { path: `/app/story?event=${event.id}`, title: event.title }
      }
      locale={locale}
    >
      <EventContent data={data} isError={isError} locale={locale} />
    </StoryDetailScreen>
  );
};

const FigureScreen: React.FC<{ id: string; locale: Locale }> = ({ id, locale }) => {
  const trpc = useTRPC();
  const { data, isError } = useQuery(trpc.story.getStoryFigure.queryOptions({ id }));
  const figure = data?.access === 'ok' ? data.figure : null;
  return (
    <StoryDetailScreen
      fallbackHref="/app/story?tab=figuren"
      share={
        figure === null ? undefined : { path: `/app/story?figure=${figure.id}`, title: figure.name }
      }
      locale={locale}
    >
      <FigureContent data={data} isError={isError} locale={locale} />
    </StoryDetailScreen>
  );
};

/**
 * One event by `?event=`, one figure by `?figure=`, else the overview. Keyed by the id, so the
 * next event or figure opens at the top.
 */
const StoryScreen: React.FC<{
  eventId: string | null;
  figureId: string | null;
  tab: Tab;
  locale: Locale;
}> = ({ eventId, figureId, tab, locale }) => {
  if (eventId !== null && eventId !== '')
    return <EventScreen key={eventId} id={eventId} locale={locale} />;
  if (figureId !== null && figureId !== '')
    return <FigureScreen key={figureId} id={figureId} locale={locale} />;
  return <StoryOverviewScreen tab={tab} locale={locale} />;
};

/**
 * The story for Leitende at `/app/story`: the events and the figures, and one of either by
 * `?event=` or `?figure=`. Everything comes from the server already cut to what has appeared.
 */
export const StoryView: React.FC = () => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const searchParameters = useSearchParams();
  const eventId = searchParameters.get('event');
  const figureId = searchParameters.get('figure');
  const tab: Tab = searchParameters.get('tab') === 'figuren' ? 'figures' : 'events';

  return (
    <>
      <SetHeaderActions />
      <StoryScreen eventId={eventId} figureId={figureId} tab={tab} locale={locale} />
    </>
  );
};
