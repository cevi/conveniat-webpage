'use client';
import { OfflineBanner } from '@/components/offline-banner';
import { Button } from '@/components/ui/buttons/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { IconTile } from '@/components/ui/icon-tile';
import { SectionLabel } from '@/components/ui/section-label';
import type { ForumProtocolEntry } from '@/features/chat/api/forum/forum-protocol';
import { ForumSubpageHeader } from '@/features/chat/components/forum/forum-subpage-header';
import { forumText } from '@/features/chat/components/forum/forum-texts';
import {
  forumProtocolVerb,
  forumTodoText,
} from '@/features/chat/components/forum/forum-todo-texts';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import { forumErrorTexts } from '@/lib/forum-error-texts';
import {
  FORUM_FLAGS_TO_HIDE,
  forumCapacityLabel,
  forumFlagReasonLabel,
  forumKindLabel,
  forumPostPath,
  forumStatusLabel,
} from '@/lib/forum-shared';
import type { ForumAuditAction } from '@/lib/prisma/enums';
import { useTRPC } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { campClockOf } from '@/utils/camp-clock';
import { cn } from '@/utils/tailwindcss-override';
import { errorReasonOf, userErrorMessage } from '@/utils/user-error-message';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRightLeft,
  BadgeCheck,
  CircleAlert,
  CircleCheck,
  Eye,
  EyeOff,
  Flag,
  Forward,
  History,
  Loader2,
  Lock,
  Merge,
  MessageSquareQuote,
  Pin,
  PinOff,
  ShieldOff,
  Split,
  Tag,
  Trash2,
  Undo2,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type React from 'react';
import { useState } from 'react';

const actionIcon: Record<ForumAuditAction, LucideIcon> = {
  STATUS_CHANGED: CircleCheck,
  PINNED: Pin,
  UNPINNED: PinOff,
  ANSWER_MARKED: MessageSquareQuote,
  ANSWER_UNMARKED: MessageSquareQuote,
  MERGED: Merge,
  UNMERGED: Split,
  DELETED: Trash2,
  ASSIGNED: Forward,
  ASSIGNMENT_ENDED: Undo2,
  MOVED: ArrowRightLeft,
  APPROVED: BadgeCheck,
  HIDDEN: EyeOff,
  RESTORED: Eye,
  FLAGS_DISMISSED: Flag,
  KIND_CHANGED: Tag,
};

/** What takes a text away from the people reading the topic: its tile is red. */
const isDestructive = (action: ForumAuditAction): boolean =>
  action === 'DELETED' || action === 'HIDDEN';

const timeFormat = (locale: Locale): Intl.DateTimeFormat =>
  new Intl.DateTimeFormat(`${locale}-CH`, {
    timeZone: 'Europe/Zurich',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });

/** "Heute", "Gestern" or the date, on the camp's clock. */
const dayLabel = (at: Date, locale: Locale, now: Date): string => {
  const day = campClockOf(at).dayKey;
  if (day === campClockOf(now).dayKey) return forumTodoText.today[locale];
  if (day === campClockOf(new Date(now.getTime() - 24 * 60 * 60 * 1000)).dayKey) {
    return forumTodoText.yesterday[locale];
  }
  return new Intl.DateTimeFormat(`${locale}-CH`, {
    timeZone: 'Europe/Zurich',
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    ...(campClockOf(at).dayKey.slice(0, 4) === campClockOf(now).dayKey.slice(0, 4)
      ? {}
      : { year: 'numeric' }),
  }).format(at);
};

/** The details of a change: why, from what to what, where to, and the note. */
const detailsOf = (entry: ForumProtocolEntry, locale: Locale): string[] => {
  const details: string[] = [];
  if (entry.reason !== undefined) details.push(forumFlagReasonLabel[entry.reason][locale]);
  if (entry.statusFrom !== undefined || entry.statusTo !== undefined) {
    details.push(
      [entry.statusFrom, entry.statusTo]
        .map((status) => (status === undefined ? '–' : forumStatusLabel[status][locale]))
        .join(' → '),
    );
  }
  if (entry.kindFrom !== undefined || entry.kindTo !== undefined) {
    details.push(
      [entry.kindFrom, entry.kindTo]
        .map((kind) => (kind === undefined ? '–' : forumKindLabel[kind][locale]))
        .join(' → '),
    );
  }
  if (entry.target !== undefined) details.push(`→ ${entry.target}`);
  if (entry.note !== null && entry.note !== '') details.push(entry.note);
  return details;
};

/** One entry: who did what as whom, to which post, and what it said if it is gone now. */
const ProtocolRow: React.FC<{ entry: ForumProtocolEntry; locale: Locale }> = ({
  entry,
  locale,
}) => {
  const capacity = forumCapacityLabel[entry.capacity][locale];
  const role =
    entry.delegatedByName === null
      ? capacity
      : `${capacity}, ${forumTodoText.delegatedBy[locale].replace('{name}', entry.delegatedByName)}`;
  const details = entry.inConversation ? [] : detailsOf(entry, locale);
  const removedText = entry.inConversation ? undefined : entry.removedText;
  return (
    <li>
      <Link
        href={forumPostPath(entry.postId)}
        className="focus-visible:focus-surface hover:bg-quiet/60 flex gap-3 px-4 py-3 transition-colors"
      >
        <IconTile
          icon={actionIcon[entry.action]}
          className={cn(isDestructive(entry.action) && 'bg-danger-soft text-danger-text')}
        />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex items-baseline gap-2">
            <span className="min-w-0 flex-1 text-[15px] leading-snug text-green-900">
              {/* the flags acted, nobody in person */}
              {entry.capacity === 'AUTOMATIC' ? (
                <b className="font-semibold">
                  {forumTodoText.automaticHide[locale].replace('{n}', String(FORUM_FLAGS_TO_HIDE))}
                </b>
              ) : (
                <>
                  <b className="font-semibold">{entry.actorName}</b> ({role}){' '}
                  {forumProtocolVerb[entry.action][locale]}
                </>
              )}
            </span>
            <time
              dateTime={new Date(entry.at).toISOString()}
              className="shrink-0 text-[12px] text-green-500"
            >
              {timeFormat(locale).format(new Date(entry.at))}
            </time>
          </span>
          <span className="text-[13px] leading-snug text-green-700">
            {entry.inConversation ? (
              <span className="inline-flex items-center gap-1">
                <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="sr-only">{forumTodoText.conversation[locale]}: </span>«
                {entry.postTitle}»
              </span>
            ) : (
              [`«${entry.postTitle}»`, ...details].join(' · ')
            )}
          </span>
          {removedText !== undefined && (
            <blockquote className="border-line mt-1 line-clamp-3 border-l-2 pl-2 text-[13px] leading-snug whitespace-pre-line text-green-700">
              {removedText}
            </blockquote>
          )}
        </span>
      </Link>
    </li>
  );
};

/**
 * The protocol of one topic for its Kernteam: every change someone made to a post they did not
 * write, newest first, by day. A private conversation's entries show their title only.
 */
export const ForumProtocolView: React.FC = () => {
  const trpc = useTRPC();
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const topicId = useParams<{ topicId: string }>().topicId;
  const [now] = useState(() => new Date());

  const topics = useQuery(trpc.forum.getForumTopicList.queryOptions({}));
  const protocol = useInfiniteQuery(
    trpc.forum.getForumProtocolList.infiniteQueryOptions(
      { topicId },
      { getNextPageParam: (last) => last.nextCursor },
    ),
  );
  const topicName = topics.data?.find((topic) => topic.id === topicId)?.name;
  const entries = protocol.data?.pages.flatMap((page) => page.items) ?? [];

  const days: { key: string; label: string; entries: ForumProtocolEntry[] }[] = [];
  for (const entry of entries) {
    const at = new Date(entry.at);
    const key = campClockOf(at).dayKey;
    const day = days.at(-1);
    if (day?.key === key) day.entries.push(entry);
    else days.push({ key, label: dayLabel(at, locale, now), entries: [entry] });
  }

  let content: React.ReactNode;
  if (protocol.data === undefined) {
    if (protocol.isError) {
      const forbidden = errorReasonOf(protocol.error)?.reason === 'protocolKernteamOnly';
      content = (
        <EmptyState
          icon={forbidden ? ShieldOff : CircleAlert}
          title={userErrorMessage(protocol.error, locale, forumErrorTexts)}
        />
      );
    } else {
      content = (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-green-700" aria-hidden="true" />
        </div>
      );
    }
  } else if (entries.length === 0) {
    content = (
      <EmptyState
        icon={History}
        title={forumTodoText.protocolEmpty[locale]}
        description={forumTodoText.protocolEmptyDescription[locale]}
      />
    );
  } else {
    content = (
      <>
        {days.map((day) => (
          <section key={day.key} className="flex flex-col gap-2">
            <SectionLabel className="px-1">{day.label}</SectionLabel>
            <Card as="ul" divided>
              {day.entries.map((entry) => (
                <ProtocolRow key={entry.id} entry={entry} locale={locale} />
              ))}
            </Card>
          </section>
        ))}
        {protocol.hasNextPage && (
          <Button
            variant="quiet"
            size="touch"
            onClick={() => void protocol.fetchNextPage()}
            disabled={protocol.isFetchingNextPage}
          >
            {forumText.loadMore[locale]}
          </Button>
        )}
      </>
    );
  }

  return (
    <div className="bg-page pb-28">
      <ForumSubpageHeader
        title={forumTodoText.protocol[locale]}
        locale={locale}
        fallbackHref={`/app/forum?topic=${topicId}`}
      />
      <OfflineBanner locale={locale} />
      <div className="mx-auto flex max-w-2xl flex-col gap-5 px-4 pt-3">
        {topicName !== undefined && (
          <p className="text-[15px] font-semibold text-green-700">{topicName}</p>
        )}
        {content}
      </div>
    </div>
  );
};
