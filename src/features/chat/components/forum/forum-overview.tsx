'use client';
import { SetHeaderActions } from '@/components/header/header-actions';
import { OfflineBanner } from '@/components/offline-banner';
import { AppSearchBar } from '@/components/ui/app-search-bar';
import { Button } from '@/components/ui/buttons/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { SectionLabel } from '@/components/ui/section-label';
import {
  countFilters,
  DEFAULT_FORUM_FILTERS,
  describeFilters,
  ForumFilterSheet,
  isFiltered,
  type ForumFilters,
} from '@/features/chat/components/forum/forum-filter-sheet';
import { ForumHome } from '@/features/chat/components/forum/forum-home';
import {
  FORUM_INTRO_STORAGE_KEY,
  ForumIntro,
  hasForumIntro,
} from '@/features/chat/components/forum/forum-intro';
import { ForumPostRow } from '@/features/chat/components/forum/forum-post-row';
import { forumText } from '@/features/chat/components/forum/forum-texts';
import { TopicCard, TopicSettingsSheet } from '@/features/chat/components/forum/forum-topic-parts';
import { ZentraleLink } from '@/features/chat/components/forum/zentrale-link';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import { useIntroSeen } from '@/hooks/use-intro-seen';
import { FORUM_POST_KINDS, forumKindLabel, type ForumPostKindValue } from '@/lib/forum-shared';
import { useTRPC } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import {
  Bell,
  BellOff,
  Loader2,
  Megaphone,
  MessageCircleQuestion,
  Pin,
  Plus,
  Settings2,
  SlidersHorizontal,
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import React, { useRef, useState } from 'react';

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const chipClassName = (isChosen: boolean): string =>
  cn(
    'focus-visible:focus-surface flex h-11 shrink-0 cursor-pointer items-center',
    // the visible chip is small and square; the button around it keeps the 44px target
    '[&>span]:rounded-md [&>span]:px-2.5 [&>span]:py-1.5 [&>span]:text-[13px] [&>span]:font-semibold',
    isChosen
      ? '[&>span]:bg-conveniat-green [&>span]:text-white'
      : '[&>span]:bg-chip [&>span]:text-green-800',
  );

const Chip: React.FC<{ chosen: boolean; onClick: () => void; children: React.ReactNode }> = ({
  chosen,
  onClick,
  children,
}) => (
  <button type="button" aria-pressed={chosen} onClick={onClick} className={chipClassName(chosen)}>
    <span>{children}</span>
  </button>
);

/** The bell of a topic in the header: a push for every new post of it, or none. */
const TopicSubscriptionButton: React.FC<{
  topicId: string;
  subscribed: boolean;
  locale: Locale;
}> = ({ topicId, subscribed, locale }) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { mutate, isPending } = useMutation(
    trpc.forum.updateForumTopicSubscription.mutationOptions({
      onSettled: () =>
        void queryClient.invalidateQueries(trpc.forum.getForumTopicList.pathFilter()),
    }),
  );
  const label = subscribed ? forumText.unsubscribeTopic[locale] : forumText.subscribeTopic[locale];
  const Icon = subscribed ? Bell : BellOff;
  return (
    <button
      type="button"
      aria-pressed={subscribed}
      aria-label={label}
      title={label}
      disabled={isPending}
      onClick={() => mutate({ topicId, subscribed: !subscribed })}
      className={cn(
        'focus-visible:focus-surface hover:bg-quiet flex h-11 w-11 cursor-pointer items-center justify-center rounded-full',
        subscribed ? 'text-conveniat-green' : 'text-green-700',
      )}
    >
      <Icon className={cn('h-5 w-5', subscribed && 'fill-current')} aria-hidden="true" />
    </button>
  );
};

/**
 * What the feed says when it lists nothing. A filter that matches nothing says so and offers the
 * way back; below pinned posts one quiet line is enough, since the page is not empty; only an
 * empty forum gets the full empty state.
 */
const FeedEmpty: React.FC<{
  filtered: boolean;
  besidesPinned: boolean;
  onResetFilters: () => void;
  locale: Locale;
}> = ({ filtered, besidesPinned, onResetFilters, locale }) => {
  if (filtered) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <p className="text-[15px] text-green-700">{forumText.noFilterMatch[locale]}</p>
        <Button variant="outlined" size="touch" onClick={onResetFilters}>
          {forumText.resetFiltersAction[locale]}
        </Button>
      </div>
    );
  }
  if (besidesPinned) {
    return (
      <p className="py-3 text-center text-[14px] text-green-700">
        {forumText.emptyBesidesPinnedTitle[locale]}
      </p>
    );
  }
  return (
    <EmptyState
      icon={Megaphone}
      title={forumText.emptyTitle[locale]}
      description={forumText.emptyHint[locale]}
    />
  );
};

/**
 * The forum: its start page with the topics, or with `?topic=` the feed of one topic. One page
 * for both, so the app shell precaches one route for the forum.
 */
export const ForumOverview: React.FC = () => {
  const trpc = useTRPC();
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const topicId = useSearchParams().get('topic') ?? undefined;
  const intro = useQuery(trpc.forum.getForumIntro.queryOptions({}));
  const { introSeen, markIntroSeen } = useIntroSeen(FORUM_INTRO_STORAGE_KEY);
  const [introAsked, setIntroAsked] = useState(false);

  // the first visit on this device waits for the intro rather than flashing the forum first;
  // without one written, or while offline without a cached one, the forum opens as it is
  if (introSeen === false && intro.isPending) {
    return (
      <div className="bg-page flex justify-center pt-24">
        <Loader2 className="h-6 w-6 animate-spin text-green-700" aria-hidden="true" />
      </div>
    );
  }
  if (hasForumIntro(intro.data) && (introAsked || introSeen === false)) {
    return (
      <>
        <SetHeaderActions />
        <ForumIntro
          intro={intro.data}
          locale={locale}
          onContinue={() => {
            markIntroSeen();
            setIntroAsked(false);
          }}
        />
      </>
    );
  }
  const showIntro = hasForumIntro(intro.data) ? (): void => setIntroAsked(true) : undefined;
  return topicId === undefined ? (
    <ForumHome onShowIntro={showIntro} />
  ) : (
    <ForumTopicFeed key={topicId} topicId={topicId} />
  );
};

/** The kinds a topic's feed narrows to, "Alle" first. */
const KIND_FILTERS: (ForumPostKindValue | undefined)[] = [undefined, ...FORUM_POST_KINDS];

/**
 * One topic: who answers there, the way to write its Kernteam privately, its posts newest first
 * with the Kernteam's pinned posts on top. Searching shows what already exists before anyone
 * writes it a second time.
 */
const ForumTopicFeed: React.FC<{ topicId: string }> = ({ topicId }) => {
  const trpc = useTRPC();
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const [kind, setKind] = useState<ForumPostKindValue | undefined>();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsButton = useRef<HTMLButtonElement>(null);
  const [filters, setFilters] = useState<ForumFilters>(DEFAULT_FORUM_FILTERS);
  const { status, filter, sort } = filters;
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterButton = useRef<HTMLButtonElement>(null);
  const [search, setSearch] = useState('');
  const [now] = useState(() => new Date());

  const topics = useQuery(trpc.forum.getForumTopicList.queryOptions({}));
  const settings = useQuery(trpc.forum.getForumSettings.queryOptions({}));
  const pinned = useQuery(trpc.forum.getForumPinnedPostList.queryOptions({ topicId }));
  const list = useInfiniteQuery(
    trpc.forum.getForumPostList.infiniteQueryOptions(
      { topicId, status, filter, sort, ...(kind === undefined ? {} : { kind }) },
      { getNextPageParam: (last) => last.nextCursor },
    ),
  );
  const isSearching = search.trim().length >= 3;
  const results = useQuery(
    trpc.forum.getForumPostSuggestionList.queryOptions(
      { title: search, topicId },
      { enabled: isSearching },
    ),
  );

  const chosenTopic = topics.data?.find((topic) => topic.id === topicId);
  const posts = list.data?.pages.flatMap((page) => page.items) ?? [];
  const filtered = isFiltered(filters) || kind !== undefined;
  // A filter asks for its posts, and the pinned ones would only push them out of sight: they stand
  // on top of the unfiltered feed alone, and a filtered feed lists them where they match.
  const pinnedPosts = filtered ? [] : (pinned.data ?? []);
  const pinnedIds = new Set(pinnedPosts.map((post) => post.id));
  // the pinned posts stand on top already, so the feed below leaves them out
  const feedPosts = posts.filter((post) => !pinnedIds.has(post.id));

  return (
    <div className="bg-page pb-28">
      {/* the header keeps "Zu tun" alone; what belongs to the topic sits in its card and
          above its list, so the title keeps its room */}
      <SetHeaderActions>
        <ZentraleLink counts={settings.data?.zentrale ?? null} locale={locale} />
      </SetHeaderActions>
      <OfflineBanner locale={locale} />
      <div className="mx-auto flex max-w-2xl flex-col gap-3 px-4 pt-3">
        <AppSearchBar
          placeholder={forumText.searchPlaceholder[locale]}
          label={forumText.searchPlaceholder[locale]}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onClear={() => setSearch('')}
          onPage
        />

        {chosenTopic !== undefined && (
          <TopicCard
            topic={chosenTopic}
            locale={locale}
            action={
              chosenTopic.isAdmin ? (
                <button
                  ref={settingsButton}
                  type="button"
                  onClick={() => setSettingsOpen(true)}
                  aria-label={forumText.topicSettings[locale]}
                  className="focus-visible:focus-surface hover:bg-quiet -mt-1.5 -mr-1.5 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-green-700"
                >
                  <Settings2 className="h-5 w-5" aria-hidden="true" />
                </button>
              ) : (
                <TopicSubscriptionButton
                  topicId={chosenTopic.id}
                  subscribed={chosenTopic.subscribed}
                  locale={locale}
                />
              )
            }
          />
        )}

        <div className="flex items-center gap-1">
          <div className="-ml-4 flex min-w-0 flex-1 [scrollbar-width:none] gap-1.5 overflow-x-auto pl-4">
            {KIND_FILTERS.map((value) => (
              <Chip key={value ?? 'all'} chosen={kind === value} onClick={() => setKind(value)}>
                {value === undefined ? forumText.allTopics[locale] : forumKindLabel[value][locale]}
              </Chip>
            ))}
          </div>
          <button
            ref={filterButton}
            type="button"
            onClick={() => setFiltersOpen(true)}
            aria-label={
              isFiltered(filters)
                ? `${forumText.filterTitle[locale]}: ${describeFilters(filters, locale)}`
                : forumText.filterTitle[locale]
            }
            aria-pressed={isFiltered(filters)}
            className={cn(
              'focus-visible:focus-surface hover:bg-quiet relative -mr-2 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full',
              isFiltered(filters) ? 'text-conveniat-green' : 'text-green-700',
            )}
          >
            <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
            {/* the count is the one sign of a filter: no line above the list, so the empty
                state's reset is the only one outside the sheet */}
            {isFiltered(filters) && (
              <span
                aria-hidden="true"
                className="bg-conveniat-green absolute top-1 right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[11px] leading-none font-bold text-white"
              >
                {countFilters(filters)}
              </span>
            )}
          </button>
        </div>

        {isSearching ? (
          <Card as="ul" divided>
            {results.isLoading && (
              <li className="flex justify-center p-4">
                <Loader2 className="h-5 w-5 animate-spin text-green-700" aria-hidden="true" />
              </li>
            )}
            {/* the search is there to find a post before writing it; finding none leads on to
                writing it, with what was searched for as its title */}
            {results.data?.length === 0 && (
              <li className="flex flex-col items-start gap-3 px-4 py-4">
                <p className="text-[15px] text-green-800">
                  {forumText.searchNoResult[locale].replace('{query}', search.trim())}
                </p>
                <Button asChild variant="outlined" size="touch">
                  <Link
                    href={`/app/forum/new?${new URLSearchParams({
                      title: search.trim(),
                      topic: topicId,
                    }).toString()}`}
                  >
                    <Plus aria-hidden="true" />
                    {forumText.writeAsNewPost[locale]}
                  </Link>
                </Button>
              </li>
            )}
            {results.data?.map((post) => (
              <ForumPostRow key={post.id} post={post} locale={locale} showTopic={false} now={now} />
            ))}
          </Card>
        ) : (
          <>
            {pinnedPosts.length > 0 && (
              <section className="mb-1 flex flex-col gap-2">
                <SectionLabel className="flex items-center gap-1.5">
                  <Pin className="h-3.5 w-3.5 rotate-30" aria-hidden="true" />
                  {forumText.pinned[locale]}
                </SectionLabel>
                <Card as="ul" divided className="border-tint-line bg-tint">
                  {pinnedPosts.map((post) => (
                    <ForumPostRow
                      key={post.id}
                      post={post}
                      locale={locale}
                      showTopic={false}
                      now={now}
                    />
                  ))}
                </Card>
              </section>
            )}

            <section className="flex flex-col gap-2">
              {list.isLoading && (
                <Card className="flex justify-center p-6">
                  <Loader2 className="h-6 w-6 animate-spin text-green-700" aria-hidden="true" />
                </Card>
              )}
              {list.isError && posts.length === 0 && (
                <EmptyState icon={MessageCircleQuestion} title={forumText.loadFailed[locale]} />
              )}
              {!list.isLoading &&
                !list.isError &&
                !list.hasNextPage &&
                feedPosts.length === 0 &&
                (topics.data?.length ?? 0) > 0 && (
                  <FeedEmpty
                    filtered={filtered}
                    besidesPinned={pinnedIds.size > 0}
                    onResetFilters={() => {
                      setFilters(DEFAULT_FORUM_FILTERS);
                      setKind(undefined);
                    }}
                    locale={locale}
                  />
                )}
              {feedPosts.length > 0 && (
                <Card as="ul" divided>
                  {feedPosts.map((post) => (
                    <ForumPostRow
                      key={post.id}
                      post={post}
                      locale={locale}
                      showTopic={false}
                      now={now}
                      compact
                    />
                  ))}
                </Card>
              )}
              {list.hasNextPage && (
                <button
                  type="button"
                  onClick={() => void list.fetchNextPage()}
                  disabled={list.isFetchingNextPage}
                  className="focus-visible:focus-surface bg-quiet hover:bg-chip flex h-11 cursor-pointer items-center justify-center rounded-xl text-[15px] font-semibold text-green-900"
                >
                  {list.isFetchingNextPage ? (
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                  ) : (
                    forumText.loadMore[locale]
                  )}
                </button>
              )}
            </section>
          </>
        )}
      </div>

      <ForumFilterSheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        anchor={filterButton}
        filters={filters}
        onChange={setFilters}
        offered={[
          'all',
          'mine',
          'subscribed',
          // only the filters that can show something to this person
          ...(settings.data?.hasOpenAssignments === true ? (['assignedToMe'] as const) : []),
          ...((settings.data?.moderationRequired === true ||
            chosenTopic?.moderationRequired === true) &&
          settings.data?.canModerate === true
            ? (['pending'] as const)
            : []),
          ...(chosenTopic?.isAdmin === true || settings.data?.canModerate === true
            ? (['flagged'] as const)
            : []),
        ]}
        locale={locale}
      />

      {chosenTopic?.isAdmin === true && (
        <TopicSettingsSheet
          topic={chosenTopic}
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          anchor={settingsButton}
          locale={locale}
        />
      )}

      {/* there before the topics load */}
      <Link
        href={`/app/forum/new?topic=${topicId}`}
        className="bg-conveniat-green focus-visible:focus-surface-filled fixed right-4 bottom-[calc(var(--app-tab-bar-height)+16px)] z-30 flex h-12 items-center gap-2 rounded-2xl px-5 text-[15px] font-semibold text-white shadow-lg hover:bg-green-700"
      >
        <Plus className="h-5 w-5" aria-hidden="true" />
        {forumText.newPost[locale]}
      </Link>
    </div>
  );
};
