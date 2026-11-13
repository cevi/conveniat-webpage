'use client';

import { SetHeaderActions } from '@/components/header/header-actions';
import { OfflineBanner } from '@/components/offline-banner';
import { AppSearchBar } from '@/components/ui/app-search-bar';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { IconTile } from '@/components/ui/icon-tile';
import { ListRow } from '@/components/ui/list-row';
import { SectionLabel } from '@/components/ui/section-label';
import {
  ForumHomeSkeleton,
  useSkeletonDelayPassed,
} from '@/features/chat/components/forum/forum-home-skeleton';
import { ForumPostRow } from '@/features/chat/components/forum/forum-post-row';
import { forumText, relativeTimeText } from '@/features/chat/components/forum/forum-texts';
import { ForumTopicIconView } from '@/features/chat/components/forum/forum-topic-icon';
import { ZentraleLink } from '@/features/chat/components/forum/zentrale-link';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import { forumPostPath, forumStatusLabel } from '@/lib/forum-shared';
import { useTRPC } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Info, Loader2, Lock, MessageCircleQuestion, Pin, Plus } from 'lucide-react';
import Link from 'next/link';
import type React from 'react';
import { useState } from 'react';

/**
 * The forum's start page, topics first: the user's own private conversations on top, then the
 * topics, each with who answers there (its Kernteam) and how much is open, and the pinned posts
 * of all topics. A topic opens its feed. The search looks through every topic.
 */
export const ForumHome: React.FC<{
  /** opens the forum's intro again; absent while editors wrote none */
  onShowIntro?: (() => void) | undefined;
}> = ({ onShowIntro }) => {
  const trpc = useTRPC();
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const [search, setSearch] = useState('');
  const [now] = useState(() => new Date());

  const skeletonDelayPassed = useSkeletonDelayPassed();
  const topics = useQuery(trpc.forum.getForumTopicList.queryOptions({}));
  const settings = useQuery(trpc.forum.getForumSettings.queryOptions({}));
  const conversations = useQuery(trpc.forum.getForumConversationList.queryOptions({}));
  const pinned = useQuery(trpc.forum.getForumPinnedPostList.queryOptions({}));
  const isSearching = search.trim().length >= 3;
  const results = useQuery(
    trpc.forum.getForumPostSuggestionList.queryOptions({ title: search }, { enabled: isSearching }),
  );

  // Which page this is, the topics or the empty state, is only known once both lists are.
  // Pending, not loading: while the persisted cache is restored the queries wait without
  // fetching. A short wait shows nothing, a longer one the skeleton of the topics.
  if (topics.isPending || conversations.isPending) {
    return (
      <div className="bg-page min-h-app-content pb-28">
        <SetHeaderActions />
        <OfflineBanner locale={locale} />
        {skeletonDelayPassed && <ForumHomeSkeleton />}
      </div>
    );
  }

  // someone in no topic can still have written a private conversation of one
  if (topics.data?.length === 0 && (conversations.data?.length ?? 0) === 0) {
    return (
      <div className="bg-page min-h-app-content pb-28">
        <SetHeaderActions />
        <OfflineBanner locale={locale} />
        <div className="mx-auto flex max-w-2xl flex-col px-4 pt-16">
          <EmptyState icon={MessageCircleQuestion} title={forumText.noTopics[locale]} />
        </div>
      </div>
    );
  }

  const ownConversations = conversations.data ?? [];
  const pinnedPosts = pinned.data ?? [];

  return (
    <div className="bg-page min-h-app-content pb-28">
      <SetHeaderActions>
        <ZentraleLink counts={settings.data?.zentrale ?? null} locale={locale} />
        {onShowIntro !== undefined && (
          <button
            type="button"
            onClick={onShowIntro}
            aria-label={forumText.howItWorks[locale]}
            title={forumText.howItWorks[locale]}
            className="focus-visible:focus-surface hover:bg-quiet flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-green-700"
          >
            <Info className="h-5 w-5" aria-hidden="true" />
          </button>
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

        {isSearching ? (
          <Card as="ul" divided>
            {results.isLoading && (
              <li className="flex justify-center p-4">
                <Loader2 className="h-5 w-5 animate-spin text-green-700" aria-hidden="true" />
              </li>
            )}
            {results.data?.length === 0 && (
              <li className="px-4 py-4 text-[15px] text-green-800">
                {forumText.searchNoResult[locale].replace('{query}', search.trim())}
              </li>
            )}
            {results.data?.map((post) => (
              <ForumPostRow key={post.id} post={post} locale={locale} showTopic now={now} />
            ))}
          </Card>
        ) : (
          <>
            {ownConversations.length > 0 && (
              <section className="flex flex-col gap-2">
                <SectionLabel>{forumText.yourConversations[locale]}</SectionLabel>
                <Card as="ul" divided>
                  {ownConversations.map((conversation) => (
                    <li key={conversation.postId}>
                      <ListRow href={forumPostPath(conversation.postId)}>
                        <IconTile icon={Lock} />
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="font-heading text-heading truncate text-[15px] font-bold">
                            {conversation.title}
                          </span>
                          <span className="truncate text-[13px] text-green-700">
                            {conversation.topicName} ·{' '}
                            {conversation.closed
                              ? forumText.closedConversation[locale]
                              : forumStatusLabel[conversation.status][locale]}{' '}
                            · {relativeTimeText(new Date(conversation.lastActivity), locale, now)}
                          </span>
                        </span>
                        {conversation.unreadCount > 0 && (
                          <span className="bg-conveniat-green min-w-[22px] rounded-full px-1.5 text-center text-[12px] leading-[22px] font-bold text-white">
                            {conversation.unreadCount}
                          </span>
                        )}
                      </ListRow>
                    </li>
                  ))}
                </Card>
              </section>
            )}

            {/* without a topic, only the conversations above, and no empty card */}
            {(topics.data?.length ?? 0) > 0 && (
              <section className="flex flex-col gap-2">
                <SectionLabel>{forumText.topics[locale]}</SectionLabel>
                <Card as="ul" divided>
                  {topics.data?.map((topic) => (
                    <li key={topic.id}>
                      <ListRow href={`/app/forum?topic=${topic.id}`}>
                        <ForumTopicIconView icon={topic.icon} />
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="font-heading text-heading truncate text-[15px] font-bold">
                            {topic.name}
                          </span>
                          <span className="truncate text-[13px] text-green-700">
                            {[
                              ...(topic.kernteamLabels ?? []).slice(0, 2),
                              // nothing open is no news, and "0 offen" reads like nobody cares
                              ...(topic.openPostCount > 0
                                ? [
                                    forumText.openCount[locale].replace(
                                      '{n}',
                                      String(topic.openPostCount),
                                    ),
                                  ]
                                : []),
                            ].join(' · ')}
                          </span>
                        </span>
                        <ChevronRight
                          className={cn('h-5 w-5 shrink-0 text-green-600')}
                          aria-hidden="true"
                        />
                      </ListRow>
                    </li>
                  ))}
                </Card>
              </section>
            )}

            {pinnedPosts.length > 0 && (
              <section className="flex flex-col gap-2">
                <SectionLabel className="flex items-center gap-1.5">
                  <Pin className="h-3.5 w-3.5 rotate-30" aria-hidden="true" />
                  {forumText.pinned[locale]}
                </SectionLabel>
                <Card as="ul" divided className="border-tint-line bg-tint">
                  {pinnedPosts.map((post) => (
                    <ForumPostRow key={post.id} post={post} locale={locale} showTopic now={now} />
                  ))}
                </Card>
              </section>
            )}
          </>
        )}
      </div>

      <Link
        href="/app/forum/new"
        className="bg-conveniat-green focus-visible:focus-surface-filled fixed right-4 bottom-[calc(var(--app-tab-bar-height)+16px)] z-30 flex h-12 items-center gap-2 rounded-2xl px-5 text-[15px] font-semibold text-white shadow-lg hover:bg-green-700"
      >
        <Plus className="h-5 w-5" aria-hidden="true" />
        {forumText.newPost[locale]}
      </Link>
    </div>
  );
};
