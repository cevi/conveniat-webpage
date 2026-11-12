import { ForumStatusPill } from '@/features/chat/components/forum/forum-status-pill';
import { forumText, relativeTimeText } from '@/features/chat/components/forum/forum-texts';
import { KernteamBadge } from '@/features/chat/components/forum/kernteam-badge';
import { forumKindLabel, type ForumPostSummary } from '@/lib/forum-shared';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import {
  CheckCircle2,
  Clock,
  EyeOff,
  Flag,
  Image as ImageIcon,
  MapPin,
  MessageCircle,
  Pin,
  ThumbsUp,
} from 'lucide-react';
import Link from 'next/link';
import type React from 'react';

/**
 * One post in a list: status and place first, because they decide whether it is the problem the
 * reader came for, then the title, two lines of text and the counts. The whole row is the link.
 */
export const ForumPostRow: React.FC<{
  post: ForumPostSummary;
  locale: Locale;
  /** the topic's name, for a list of several topics */
  showTopic: boolean;
  now: Date;
  /**
   * for the feed below the pinned posts: title and counts without the text, the place as a pin
   * only, and no pill for an open post, the state nearly every post in the feed is in
   */
  compact?: boolean;
}> = ({ post, locale, showTopic, now, compact = false }) => (
  <li>
    <Link
      href={`/app/forum/${post.id}`}
      className="focus-visible:focus-surface hover:bg-quiet/60 flex flex-col gap-1.5 px-4 py-3 transition-colors"
    >
      <span className="flex flex-wrap items-center gap-1.5 text-[12px] text-green-700">
        {post.pinned && (
          <span className="bg-conveniat-green inline-flex h-[22px] w-[22px] items-center justify-center rounded-full text-white">
            <Pin className="h-3 w-3 rotate-30" aria-hidden="true" />
            <span className="sr-only">{forumText.pinned[locale]}</span>
          </span>
        )}
        {/* what kind of post it is; a cache from before kinds only knew problems */}
        {post.kind !== undefined && post.kind !== 'PROBLEM' && (
          <span className="bg-chip inline-flex h-[22px] items-center rounded-md px-1.5 text-[12px] font-semibold text-green-900">
            {forumKindLabel[post.kind][locale]}
          </span>
        )}
        {post.pending === true && (
          <span className="border-line inline-flex h-[22px] items-center gap-1 rounded-full border border-dashed bg-white px-2 text-[12px] font-semibold text-green-700">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            {forumText.pendingPill[locale]}
          </span>
        )}
        {/* a problem shows where it stands; a question whether it was answered */}
        {post.pending !== true &&
          (post.kind ?? 'PROBLEM') === 'PROBLEM' &&
          (!compact || post.status !== 'OPEN') && (
            <ForumStatusPill status={post.status} locale={locale} />
          )}
        {post.kind === 'QUESTION' && post.answered === true && (
          <span className="bg-conveniat-green border-conveniat-green inline-flex h-[22px] items-center gap-1 rounded-full border px-2 text-[12px] font-semibold text-white">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            {forumText.answered[locale]}
          </span>
        )}
        {post.hidden === true && (
          <span className="bg-quiet inline-flex h-[22px] items-center gap-1 rounded-md px-1.5 text-[12px] font-semibold text-green-800">
            <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
            {forumText.hiddenPill[locale]}
          </span>
        )}
        {(post.flagCount ?? 0) > 0 && (
          <span className="border-danger-line bg-danger-soft text-danger-text inline-flex h-[22px] items-center gap-1 rounded-md border px-1.5 text-[12px] font-semibold">
            <Flag className="h-3.5 w-3.5" aria-hidden="true" />
            {forumText.flagsPill[locale].replace('{n}', String(post.flagCount ?? 0))}
          </span>
        )}
        {post.byTopicAdmin && <KernteamBadge locale={locale} label={post.kernteamLabel} />}
        {post.location !== null && (
          <span
            className={cn(
              'bg-tint inline-flex items-center gap-1 rounded-md py-px text-green-800',
              compact ? 'px-1' : 'px-1.5',
            )}
          >
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            <span className={cn(compact && 'sr-only')}>{forumText.onMap[locale]}</span>
          </span>
        )}
        {showTopic && <span className="truncate">{post.topicName}</span>}
      </span>
      <span className="font-heading text-heading text-[15px] leading-snug font-bold">
        {post.title}
      </span>
      {!compact && post.excerpt !== '' && (
        <span className="line-clamp-2 text-[14px] leading-[1.4] text-green-700">
          {post.excerpt}
        </span>
      )}
      <span className="flex items-center gap-3 text-[13px] font-semibold text-green-800">
        <span className={cn('flex items-center gap-1', post.likedByMe && 'text-conveniat-green')}>
          <ThumbsUp
            className={cn('h-4 w-4', post.likedByMe && 'fill-current')}
            aria-hidden="true"
          />
          {post.likeCount}
        </span>
        <span className="flex items-center gap-1">
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          {post.commentCount}
        </span>
        {post.imageCount > 0 && (
          <span className="flex items-center gap-1">
            <ImageIcon className="h-4 w-4" aria-hidden="true" />
            {post.imageCount}
          </span>
        )}
        {/* a long name gives way, the time does not: it tells how fresh the post is */}
        <span className="ml-auto flex min-w-0 gap-1 font-normal text-green-600">
          <span className="truncate">{post.author?.name ?? ''}</span>
          <span className="shrink-0">
            · {relativeTimeText(new Date(post.createdAt), locale, now)}
          </span>
        </span>
      </span>
    </Link>
  </li>
);
