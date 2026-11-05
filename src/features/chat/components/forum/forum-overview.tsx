'use client';

import { SetHeaderActions } from '@/components/header/header-actions';
import { OfflineBanner } from '@/components/offline-banner';
import { AppSearchBar } from '@/components/ui/app-search-bar';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { SectionLabel } from '@/components/ui/section-label';
import { segmentClassName, segmentedTrackClassName } from '@/components/ui/segmented-control';
import { ForumPostRow } from '@/features/chat/components/forum/forum-post-row';
import { forumText } from '@/features/chat/components/forum/forum-texts';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import { trpc } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Bell, BellOff, Loader2, Megaphone, MessageCircleQuestion, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useState } from 'react';

type StatusFilter = 'active' | 'done';
type ListFilter = 'all' | 'mine' | 'assignedToMe' | 'subscribed';

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
  const utils = trpc.useUtils();
  const { mutate, isPending } = trpc.forum.updateForumTopicSubscription.useMutation({
    onSettled: () => void utils.forum.getForumTopicList.invalidate(),
  });
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
 * The forum: the posts of every topic the user belongs to, newest first, the Kernteam's pinned
 * posts on top. Searching shows what already exists before anyone writes it a second time.
 */
export const ForumOverview: React.FC = () => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const router = useRouter();
  const searchParameters = useSearchParams();
  const topicId = searchParameters.get('topic') ?? undefined;
  const [status, setStatus] = useState<StatusFilter>('active');
  const [filter, setFilter] = useState<ListFilter>('all');
  const [sort, setSort] = useState<'new' | 'popular'>('new');
  const [search, setSearch] = useState('');
  const [now] = useState(() => new Date());

  const topics = trpc.forum.getForumTopicList.useQuery({});
  const pinned = trpc.forum.getForumPinnedPostList.useQuery(
    topicId === undefined ? {} : { topicId },
  );
  const list = trpc.forum.getForumPostList.useInfiniteQuery(
    { ...(topicId === undefined ? {} : { topicId }), status, filter, sort },
    { getNextPageParam: (last) => last.nextCursor },
  );
  const isSearching = search.trim().length >= 3;
  const results = trpc.forum.getForumPostSuggestionList.useQuery(
    { title: search, ...(topicId === undefined ? {} : { topicId }) },
    { enabled: isSearching },
  );

  const chosenTopic = topics.data?.find((topic) => topic.id === topicId);
  const setTopic = (id: string | undefined): void => {
    router.replace(id === undefined ? '/app/forum' : `/app/forum?topic=${id}`, { scroll: false });
  };
  const posts = list.data?.pages.flatMap((page) => page.items) ?? [];
  const pinnedIds = new Set((pinned.data ?? []).map((post) => post.id));

  return (
    <div className="bg-page min-h-dvh pb-28">
      <SetHeaderActions>
        {chosenTopic !== undefined && (
          <TopicSubscriptionButton
            topicId={chosenTopic.id}
            subscribed={chosenTopic.subscribed}
            locale={locale}
          />
        )}
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

        {(topics.data?.length ?? 0) > 1 && (
          <div className="-mx-4 flex [scrollbar-width:none] gap-1.5 overflow-x-auto px-4">
            <Chip chosen={topicId === undefined} onClick={() => setTopic(undefined)}>
              {forumText.allTopics[locale]}
            </Chip>
            {topics.data?.map((topic) => (
              <Chip key={topic.id} chosen={topic.id === topicId} onClick={() => setTopic(topic.id)}>
                {topic.name}
              </Chip>
            ))}
          </div>
        )}

        {isSearching ? (
          <Card as="ul" divided>
            {results.isLoading && (
              <li className="flex justify-center p-4">
                <Loader2 className="h-5 w-5 animate-spin text-green-700" aria-hidden="true" />
              </li>
            )}
            {results.data?.length === 0 && (
              <li className="px-4 py-3 text-[14px] text-green-700">
                {forumText.emptyTitle[locale]}
              </li>
            )}
            {results.data?.map((post) => (
              <ForumPostRow
                key={post.id}
                post={post}
                locale={locale}
                showTopic={topicId === undefined}
                now={now}
              />
            ))}
          </Card>
        ) : (
          <>
            {(pinned.data?.length ?? 0) > 0 && (
              <section className="flex flex-col gap-2">
                <SectionLabel>{forumText.pinned[locale]}</SectionLabel>
                <Card as="ul" divided className="border-tint-line bg-tint">
                  {pinned.data?.map((post) => (
                    <ForumPostRow
                      key={post.id}
                      post={post}
                      locale={locale}
                      showTopic={topicId === undefined}
                      now={now}
                    />
                  ))}
                </Card>
              </section>
            )}

            <div className={segmentedTrackClassName}>
              {(['active', 'done'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={status === value}
                  onClick={() => setStatus(value)}
                  className={cn(
                    segmentClassName(status === value),
                    'flex-1 text-[14px] font-semibold',
                  )}
                >
                  {value === 'active' ? forumText.active[locale] : forumText.done[locale]}
                </button>
              ))}
            </div>

            <div className="-mx-4 flex [scrollbar-width:none] gap-1.5 overflow-x-auto px-4">
              {(
                [
                  ['all', forumText.filterAll],
                  ['mine', forumText.filterMine],
                  ['assignedToMe', forumText.filterAssigned],
                  ['subscribed', forumText.filterSubscribed],
                ] as const
              ).map(([value, text]) => (
                <Chip key={value} chosen={filter === value} onClick={() => setFilter(value)}>
                  {text[locale]}
                </Chip>
              ))}
            </div>

            <section className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <SectionLabel>
                  {sort === 'new' ? forumText.newest[locale] : forumText.popular[locale]}
                </SectionLabel>
                <button
                  type="button"
                  onClick={() => setSort(sort === 'new' ? 'popular' : 'new')}
                  className="focus-visible:focus-surface hover:bg-quiet -mr-2 flex h-11 cursor-pointer items-center rounded-xl px-3 text-[13px] font-semibold text-green-800"
                >
                  {sort === 'new' ? forumText.popular[locale] : forumText.newest[locale]}
                </button>
              </div>

              {list.isLoading && (
                <Card className="flex justify-center p-6">
                  <Loader2 className="h-6 w-6 animate-spin text-green-700" aria-hidden="true" />
                </Card>
              )}
              {list.isError && posts.length === 0 && (
                <EmptyState icon={MessageCircleQuestion} title={forumText.loadFailed[locale]} />
              )}
              {topics.data?.length === 0 && (
                <EmptyState
                  icon={MessageCircleQuestion}
                  title={forumText.noTopics[locale]}
                  description={forumText.noTopicsPrivate[locale]}
                />
              )}
              {!list.isLoading && posts.length === 0 && (topics.data?.length ?? 0) > 0 && (
                <EmptyState
                  icon={Megaphone}
                  title={forumText.emptyTitle[locale]}
                  description={forumText.emptyHint[locale]}
                />
              )}
              {posts.length > 0 && (
                <Card as="ul" divided>
                  {posts
                    .filter((post) => !pinnedIds.has(post.id))
                    .map((post) => (
                      <ForumPostRow
                        key={post.id}
                        post={post}
                        locale={locale}
                        showTopic={topicId === undefined}
                        now={now}
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

      {/* always there, also before the topics load and without one: the composer then sends
          the report privately to the Zentrale */}
      <Link
        href={topicId === undefined ? '/app/forum/new' : `/app/forum/new?topic=${topicId}`}
        className="bg-conveniat-green focus-visible:focus-surface-filled fixed right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-20 flex h-[52px] items-center gap-2 rounded-2xl px-5 text-[15px] font-bold text-white shadow-lg hover:bg-green-700 xl:bottom-8"
      >
        <Plus className="h-5 w-5" aria-hidden="true" />
        {forumText.newPost[locale]}
      </Link>
    </div>
  );
};
