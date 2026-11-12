'use client';
import { OfflineBanner } from '@/components/offline-banner';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { SectionLabel } from '@/components/ui/section-label';
import { segmentClassName, segmentedTrackClassName } from '@/components/ui/segmented-control';
import type { ForumTodoPost } from '@/features/chat/api/forum/forum-zentrale';
import { ForumPostView } from '@/features/chat/components/forum/forum-post-view';
import { ForumStatusPill } from '@/features/chat/components/forum/forum-status-pill';
import {
  durationText,
  forumText,
  relativeTimeText,
} from '@/features/chat/components/forum/forum-texts';
import { forumTodoText } from '@/features/chat/components/forum/forum-todo-texts';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import { useIsDesktop } from '@/hooks/use-is-desktop';
import { forumErrorTexts } from '@/lib/forum-error-texts';
import { forumKindLabel } from '@/lib/forum-shared';
import { useTRPC } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { userErrorMessage } from '@/utils/user-error-message';
import { useQuery } from '@tanstack/react-query';
import {
  CircleAlert,
  Flag,
  Forward,
  Hand,
  Inbox,
  Loader2,
  Lock,
  MessageCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type React from 'react';
import { useState } from 'react';

type TodoScope = 'mine' | 'all';
type TodoSection = 'flagged' | 'conversations' | 'waiting' | 'mine';

/** The sections in the order they are urgent. */
const SECTIONS: readonly TodoSection[] = ['flagged', 'conversations', 'waiting', 'mine'];

const sectionText: Record<TodoSection, StaticTranslationString> = {
  flagged: forumTodoText.sectionFlagged,
  conversations: forumTodoText.sectionConversations,
  waiting: forumTodoText.sectionWaiting,
  mine: forumTodoText.sectionMine,
};

const chipClassName = 'bg-chip rounded-md px-1.5 py-px font-semibold text-green-900';
const dangerChipClassName =
  'bg-danger-soft border-danger-line text-danger-text inline-flex items-center gap-1 rounded-md border px-1.5 py-px font-semibold';

/** What the first line of a row says, by section: why the post is in it. */
const RowMeta: React.FC<{
  section: TodoSection;
  post: ForumTodoPost;
  locale: Locale;
  now: Date;
}> = ({ section, post, locale, now }) => {
  const created = new Date(post.createdAt);
  const flags = post.openFlags ?? 0;
  return (
    <span className="flex flex-wrap items-center gap-1.5 text-[12px] text-green-700">
      {section === 'flagged' && (
        <>
          {flags > 0 && (
            <span className={dangerChipClassName}>
              <Flag className="h-3.5 w-3.5" aria-hidden="true" />
              {flags === 1
                ? forumTodoText.flagCountOne[locale]
                : forumTodoText.flagCount[locale].replace('{n}', String(flags))}
            </span>
          )}
          {post.reviewRequested === true && (
            <span className={dangerChipClassName}>{forumTodoText.reviewRequested[locale]}</span>
          )}
          {post.hidden === true && (
            <span className={dangerChipClassName}>{forumTodoText.hidden[locale]}</span>
          )}
        </>
      )}
      {section === 'conversations' && (
        <span className={cn(chipClassName, 'inline-flex items-center gap-1')}>
          <Lock className="h-3.5 w-3.5" aria-hidden="true" />
          {post.conversation?.topicName ?? post.topicName}
        </span>
      )}
      {(section === 'waiting' || (section === 'conversations' && post.waiting)) && (
        <span>
          {forumText.waitingFor[locale].replace('{duration}', durationText(created, locale, now))}
        </span>
      )}
      {section === 'mine' && (
        <>
          <span>{relativeTimeText(created, locale, now)}</span>
          <ForumStatusPill status={post.status} locale={locale} />
        </>
      )}
      {section === 'waiting' && post.kind !== undefined && (
        <span className={chipClassName}>{forumKindLabel[post.kind][locale]}</span>
      )}
      {section !== 'conversations' && <span className={chipClassName}>{post.topicName}</span>}
      {post.claimedBy !== null && (
        <span className="bg-tint border-tint-line text-conveniat-green inline-flex items-center gap-1 rounded-md border px-1.5 py-px font-semibold">
          <Hand className="h-3.5 w-3.5" aria-hidden="true" />
          {forumText.claimedChip[locale].replace('{name}', post.claimedBy.name)}
        </span>
      )}
      {section !== 'mine' && post.forwardedTo.length > 0 && (
        <span className="inline-flex items-center gap-1 font-semibold text-green-800">
          <Forward className="h-3.5 w-3.5" aria-hidden="true" />
          {post.forwardedTo.join(', ')}
        </span>
      )}
    </span>
  );
};

/** One post: why it is here, its title and who wrote it. */
const TodoRow: React.FC<{
  section: TodoSection;
  post: ForumTodoPost;
  locale: Locale;
  now: Date;
  selected: boolean;
  onSelect: (() => void) | undefined;
}> = ({ section, post, locale, now, selected, onSelect }) => (
  <li>
    <Link
      href={`/app/forum/${post.id}?from=zentrale`}
      onClick={(event): void => {
        // on a desktop the post opens next to the list, not on its own page
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
      <RowMeta section={section} post={post} locale={locale} now={now} />
      <span className="font-heading text-heading text-[15px] leading-snug font-bold">
        {post.title}
      </span>
      <span className="flex items-center gap-3 text-[12px] text-green-700">
        <span className="min-w-0 truncate">{post.author?.name ?? ''}</span>
        <span className="inline-flex shrink-0 items-center gap-1">
          <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
          {post.commentCount}
        </span>
      </span>
    </Link>
  </li>
);

/**
 * "Zu tun": what waits for whoever handles posts, by urgency: flags, private conversations,
 * posts without an answer and what was forwarded to them. Someone who moderates every topic
 * can widen it from their own topics to all. On a phone a post opens on its own page and comes
 * back here; on a desktop it opens next to the list, so the desk works through it without
 * losing its place.
 */
export const ForumZentraleView: React.FC = () => {
  const trpc = useTRPC();
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const router = useRouter();
  const parameters = useSearchParams();
  const isDesktop = useIsDesktop();
  const [now] = useState(() => new Date());
  const scope: TodoScope = parameters.get('scope') === 'all' ? 'all' : 'mine';
  const selectedId = parameters.get('post') ?? undefined;

  const todo = useQuery(trpc.forum.getForumTodoList.queryOptions({ scope }));

  const go = (next: { scope?: TodoScope; post?: string | undefined }): void => {
    const query = new URLSearchParams();
    if ((next.scope ?? scope) === 'all') query.set('scope', 'all');
    const post = 'post' in next ? next.post : selectedId;
    if (post !== undefined) query.set('post', post);
    const search = query.toString();
    router.replace(search === '' ? '/app/forum/zentrale' : `/app/forum/zentrale?${search}`);
  };

  let content: React.ReactNode;
  if (todo.data === undefined) {
    content = todo.isError ? (
      <EmptyState
        icon={CircleAlert}
        title={userErrorMessage(todo.error, locale, forumErrorTexts)}
        className="pt-10"
      />
    ) : (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-green-700" aria-hidden="true" />
      </div>
    );
  } else if (SECTIONS.every((section) => todo.data[section].length === 0)) {
    content = (
      <EmptyState
        icon={Inbox}
        title={forumTodoText.nothingToDo[locale]}
        description={forumTodoText.nothingToDoDescription[locale]}
        className="pt-10"
      />
    );
  } else {
    content = SECTIONS.map((section) => {
      const posts = todo.data[section];
      return (
        <section key={section} className="flex flex-col gap-2">
          <SectionLabel
            className={cn(
              'flex items-center gap-2 px-1',
              section === 'flagged' && 'text-danger-text',
            )}
          >
            {sectionText[section][locale]}
            <span className="font-semibold tracking-normal">{posts.length}</span>
          </SectionLabel>
          {posts.length === 0 ? (
            <p className="px-1 text-[15px] text-green-500">{forumTodoText.nothing[locale]}</p>
          ) : (
            <Card as="ul" divided>
              {posts.map((post) => (
                <TodoRow
                  key={post.id}
                  section={section}
                  post={post}
                  locale={locale}
                  now={now}
                  selected={isDesktop && post.id === selectedId}
                  onSelect={isDesktop ? (): void => go({ post: post.id }) : undefined}
                />
              ))}
            </Card>
          )}
        </section>
      );
    });
  }

  const list = (
    <div className="flex min-h-0 flex-col gap-5 px-4 pt-3 pb-4">
      {todo.data?.canSeeAll === true && (
        <div className={segmentedTrackClassName}>
          {(['mine', 'all'] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={scope === option}
              onClick={() => go({ scope: option, post: undefined })}
              className={cn(
                segmentClassName(scope === option),
                'flex-1 px-1 text-[13px] font-semibold',
              )}
            >
              {option === 'mine' ? forumTodoText.scopeMine[locale] : forumTodoText.scopeAll[locale]}
            </button>
          ))}
        </div>
      )}
      {content}
    </div>
  );

  if (!isDesktop) {
    return (
      <div className="bg-page min-h-dvh pb-28">
        <OfflineBanner locale={locale} />
        {list}
      </div>
    );
  }

  return (
    <div className="bg-page grid h-[calc(100dvh-var(--app-top-inset))] grid-cols-[minmax(320px,400px)_1fr]">
      <div className="border-line overflow-y-auto border-r">
        <OfflineBanner locale={locale} />
        {list}
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
