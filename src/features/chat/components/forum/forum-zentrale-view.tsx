'use client';
import { OfflineBanner } from '@/components/offline-banner';
import { EmptyState } from '@/components/ui/empty-state';
import { segmentClassName, segmentedTrackClassName } from '@/components/ui/segmented-control';
import type { ZentralePost, ZentraleTab } from '@/features/chat/api/forum/forum-zentrale';
import { ForumPostView } from '@/features/chat/components/forum/forum-post-view';
import { ForumStatusPill } from '@/features/chat/components/forum/forum-status-pill';
import {
  durationText,
  forumText,
  relativeTimeText,
} from '@/features/chat/components/forum/forum-texts';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import { useIsDesktop } from '@/hooks/use-is-desktop';
import { useTRPC } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Forward, Hand, Inbox, Loader2, Lock, MessageCircle, ThumbsUp } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type React from 'react';
import { useState } from 'react';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

const TABS: readonly ZentraleTab[] = ['waiting', 'claimed', 'mine', 'open'];

const tabText: Record<ZentraleTab, StaticTranslationString> = {
  waiting: forumText.tabWaiting,
  claimed: forumText.tabClaimed,
  mine: forumText.tabMine,
  open: forumText.tabOpen,
};

const emptyText: Record<ZentraleTab, StaticTranslationString> = {
  waiting: forumText.emptyWaiting,
  claimed: forumText.emptyClaimed,
  mine: forumText.emptyMine,
  open: forumText.emptyOpen,
};

const isTab = (value: string | null): value is ZentraleTab => TABS.includes(value as ZentraleTab);

/** One post in the queue: how long it waits and who handles it first, then what it is. */
const QueueRow: React.FC<{
  post: ZentralePost;
  locale: Locale;
  now: Date;
  selected: boolean;
  href: string;
  onSelect: (() => void) | undefined;
}> = ({ post, locale, now, selected, href, onSelect }) => (
  <li>
    <Link
      href={href}
      onClick={(event): void => {
        // on a desktop the post opens next to the queue, not on its own page
        if (onSelect === undefined) return;
        event.preventDefault();
        onSelect();
      }}
      aria-current={selected ? 'true' : undefined}
      className={cn(
        'focus-visible:focus-surface hover:bg-quiet/60 flex flex-col gap-1 px-4 py-3 transition-colors',
        selected && 'bg-tint hover:bg-tint',
      )}
    >
      <span className="flex flex-wrap items-center gap-1.5 text-[12px] text-green-700">
        <span>
          {post.waiting
            ? forumText.waitingFor[locale].replace(
                '{duration}',
                durationText(new Date(post.createdAt), locale, now),
              )
            : relativeTimeText(new Date(post.createdAt), locale, now)}
        </span>
        <ForumStatusPill status={post.status} locale={locale} />
        <span className="bg-chip rounded-md px-1.5 py-px font-semibold text-green-900">
          {post.topicName}
        </span>
        {post.private === true && (
          <span className="bg-chip inline-flex items-center gap-1 rounded-md px-1.5 py-px font-semibold text-green-800">
            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
            {forumText.privatePill[locale]}
          </span>
        )}
        {post.claimedBy !== null && (
          <span className="bg-tint border-tint-line text-conveniat-green inline-flex items-center gap-1 rounded-md border px-1.5 py-px font-semibold">
            <Hand className="h-3.5 w-3.5" aria-hidden="true" />
            {forumText.claimedChip[locale].replace('{name}', post.claimedBy.name)}
          </span>
        )}
        {post.forwardedTo.length > 0 && (
          <span className="inline-flex items-center gap-1 font-semibold text-green-800">
            <Forward className="h-3.5 w-3.5" aria-hidden="true" />
            {post.forwardedTo.join(', ')}
          </span>
        )}
      </span>
      <span className="font-heading text-heading text-[15px] leading-snug font-bold">
        {post.title}
      </span>
      <span className="flex items-center gap-3 text-[12px] text-green-700">
        <span className="min-w-0 truncate">{post.author?.name ?? ''}</span>
        {post.private !== true && (
          <span className="inline-flex shrink-0 items-center gap-1">
            <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" />
            {post.likeCount}
          </span>
        )}
        <span className="inline-flex shrink-0 items-center gap-1">
          <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
          {post.commentCount}
        </span>
      </span>
    </Link>
  </li>
);

/**
 * The Zentrale: what the people who handle posts still have to answer, oldest first, in four
 * views. On a phone a post opens on its own page and comes back here; on a desktop it opens next
 * to the queue, so the desk works through it without losing its place.
 */
export const ForumZentraleView: React.FC = () => {
  const trpc = useTRPC();
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const router = useRouter();
  const parameters = useSearchParams();
  const isDesktop = useIsDesktop();
  const [now] = useState(() => new Date());
  const tab: ZentraleTab = isTab(parameters.get('tab'))
    ? (parameters.get('tab') as ZentraleTab)
    : 'waiting';
  const selectedId = parameters.get('post') ?? undefined;

  const settings = useQuery(trpc.forum.getForumSettings.queryOptions({}));
  const list = useInfiniteQuery(
    trpc.forum.getForumZentraleList.infiniteQueryOptions(
      { tab },
      { getNextPageParam: (last) => last.nextCursor ?? undefined },
    ),
  );
  const posts = list.data?.pages.flatMap((page) => page.items) ?? [];
  // absent in a persisted cache from before the Zentrale
  const counts = settings.data?.zentrale ?? null;

  const go = (next: { tab?: ZentraleTab; post?: string | undefined }): void => {
    const query = new URLSearchParams();
    const nextTab = next.tab ?? tab;
    if (nextTab !== 'waiting') query.set('tab', nextTab);
    const post = 'post' in next ? next.post : selectedId;
    if (post !== undefined) query.set('post', post);
    const search = query.toString();
    router.replace(search === '' ? '/app/forum/zentrale' : `/app/forum/zentrale?${search}`);
  };

  const countOf = (option: ZentraleTab): number | undefined => {
    if (counts === null) return undefined;
    if (option === 'waiting') return counts.waiting;
    if (option === 'mine') return counts.mine;
    return undefined;
  };

  let listContent: React.ReactNode;
  if (list.isLoading) {
    listContent = (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-green-700" aria-hidden="true" />
      </div>
    );
  } else if (posts.length === 0) {
    listContent = (
      <div className="px-4 pt-10">
        <EmptyState icon={Inbox} title={emptyText[tab][locale]} />
      </div>
    );
  } else {
    listContent = (
      <ul className="border-line divide-line divide-y border-y bg-white">
        {posts.map((post) => (
          <QueueRow
            key={post.id}
            post={post}
            locale={locale}
            now={now}
            selected={isDesktop && post.id === selectedId}
            href={`/app/forum/${post.id}?from=zentrale`}
            onSelect={isDesktop ? (): void => go({ post: post.id }) : undefined}
          />
        ))}
      </ul>
    );
  }

  const queue = (
    <div className="flex min-h-0 flex-col">
      <div className="px-4 pt-3 pb-2">
        <div className={segmentedTrackClassName}>
          {TABS.map((option) => {
            const count = countOf(option);
            return (
              <button
                key={option}
                type="button"
                aria-pressed={tab === option}
                onClick={() => go({ tab: option, post: undefined })}
                className={cn(
                  segmentClassName(tab === option),
                  'flex-1 px-1 text-[13px] font-semibold',
                )}
              >
                {tabText[option][locale]}
                {count !== undefined && count > 0 && ` ${count}`}
              </button>
            );
          })}
        </div>
      </div>
      {listContent}
      {list.hasNextPage && (
        <button
          type="button"
          onClick={() => void list.fetchNextPage()}
          disabled={list.isFetchingNextPage}
          className="focus-visible:focus-surface hover:bg-quiet mx-4 my-3 h-11 cursor-pointer rounded-xl text-[14px] font-semibold text-green-800"
        >
          {forumText.loadMore[locale]}
        </button>
      )}
    </div>
  );

  if (!isDesktop) {
    return (
      <div className="bg-page min-h-app-content pb-28">
        <OfflineBanner locale={locale} />
        {queue}
      </div>
    );
  }

  return (
    <div className="bg-page h-app-content grid grid-cols-[minmax(320px,400px)_1fr]">
      <div className="border-line overflow-y-auto border-r">
        <OfflineBanner locale={locale} />
        {queue}
      </div>
      <div className="relative min-w-0">
        {selectedId === undefined ? (
          <div className="flex h-full items-center justify-center p-6">
            <EmptyState icon={Inbox} title={forumText.pickPost[locale]} />
          </div>
        ) : (
          <ForumPostView key={selectedId} postId={selectedId} />
        )}
      </div>
    </div>
  );
};
