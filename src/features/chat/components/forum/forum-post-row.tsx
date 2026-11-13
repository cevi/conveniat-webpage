import { ForumStatusPill } from '@/features/chat/components/forum/forum-status-pill';
import { forumText, relativeTimeText } from '@/features/chat/components/forum/forum-texts';
import type { ForumPostSummary } from '@/lib/forum-shared';
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
  ShieldCheck,
  ThumbsUp,
} from 'lucide-react';
import Link from 'next/link';
import type React from 'react';

const pillClassName =
  'inline-flex h-[22px] shrink-0 items-center gap-1 rounded-full border px-2 text-[12px] font-semibold';

/**
 * Where a post stands, if that is news: a problem being worked on or done, an answered question,
 * a post waiting for approval or hidden, and for the moderators its open flags. An open problem
 * in the feed and every idea say nothing here, the state nearly every post is in.
 */
const StatePills: React.FC<{ post: ForumPostSummary; locale: Locale; compact: boolean }> = ({
  post,
  locale,
  compact,
}) => (
  <>
    {post.pending === true && (
      <span className={cn(pillClassName, 'border-line border-dashed bg-white text-green-700')}>
        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
        {forumText.pendingPill[locale]}
      </span>
    )}
    {/* a cache from before kinds only knew problems */}
    {post.pending !== true &&
      (post.kind ?? 'PROBLEM') === 'PROBLEM' &&
      (!compact || post.status !== 'OPEN') && (
        <ForumStatusPill status={post.status} locale={locale} />
      )}
    {post.kind === 'QUESTION' && post.answered === true && (
      <span className={cn(pillClassName, 'border-line bg-white text-green-800')}>
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
        {forumText.answered[locale]}
      </span>
    )}
    {post.hidden === true && (
      <span
        title={forumText.hiddenPill[locale]}
        className={cn(pillClassName, 'bg-quiet border-transparent text-green-800')}
      >
        <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
        <span className={cn(compact && 'sr-only')}>{forumText.hiddenPill[locale]}</span>
      </span>
    )}
    {(post.flagCount ?? 0) > 0 && (
      <span className={cn(pillClassName, 'border-danger-line bg-danger-soft text-danger-text')}>
        <Flag className="h-3.5 w-3.5" aria-hidden="true" />
        {forumText.flagsPill[locale].replace('{n}', String(post.flagCount ?? 0))}
      </span>
    )}
  </>
);

/** A count that only shows when there is something to count, like Discourse and GitHub do. */
const Count: React.FC<{ icon: React.ReactNode; value: number; highlighted?: boolean }> = ({
  icon,
  value,
  highlighted = false,
}) =>
  value > 0 || highlighted ? (
    <span className={cn('flex items-center gap-1', highlighted && 'text-conveniat-green')}>
      {icon}
      {value}
    </span>
  ) : null;

/**
 * One post in a list, calm like a topic list on Discourse: the title, two lines of text, and one
 * grey line with where it stands, who wrote it and when, and on the right the counts above zero.
 * The Kernteam is told apart by a small shield, not a badge, and a pinned post by a pin before
 * its title. The whole row is the link.
 */
export const ForumPostRow: React.FC<{
  post: ForumPostSummary;
  locale: Locale;
  /** the topic's name, for a list of several topics */
  showTopic: boolean;
  now: Date;
  /** for the feed below the pinned posts: title and line without the text */
  compact?: boolean;
}> = ({ post, locale, showTopic, now, compact = false }) => (
  <li>
    <Link
      href={`/app/forum/${post.id}`}
      className="focus-visible:focus-surface hover:bg-quiet/60 flex flex-col gap-1.5 px-4 py-3 transition-colors"
    >
      <span className="font-heading text-heading text-[15px] leading-snug font-bold">
        {post.pinned && (
          <>
            <Pin
              className="mr-1 mb-0.5 inline h-3.5 w-3.5 rotate-30 text-green-700"
              aria-hidden="true"
            />
            <span className="sr-only">{forumText.pinned[locale]}: </span>
          </>
        )}
        {post.title}
      </span>
      {!compact && post.excerpt !== '' && (
        <span className="line-clamp-2 text-[14px] leading-[1.4] text-green-700">
          {post.excerpt}
        </span>
      )}
      <span className="flex min-w-0 items-center gap-1.5 text-[13px] text-green-700">
        <StatePills post={post} locale={locale} compact={compact} />
        <span className="flex min-w-0 items-center gap-1.5">
          {showTopic && (
            <>
              <span className="shrink-0">{post.topicName}</span>
              <span aria-hidden="true">·</span>
            </>
          )}
          {/* the Kernteam signs with its function, others with their name */}
          {post.byTopicAdmin ? (
            <span className="flex min-w-0 items-center gap-1 font-semibold text-green-900">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="sr-only">{forumText.kernteam[locale]}: </span>
              <span className="truncate">{post.kernteamLabel ?? post.author?.name ?? ''}</span>
            </span>
          ) : (
            <span className="truncate">{post.author?.name ?? ''}</span>
          )}
          {/* a long name gives way, the time does not: it tells how fresh the post is */}
          <span className="shrink-0">
            · {relativeTimeText(new Date(post.createdAt), locale, now)}
          </span>
        </span>
        <span className="ml-auto flex shrink-0 items-center gap-2.5 pl-1 font-semibold text-green-800">
          {post.location !== null && (
            <MapPin className="h-4 w-4" aria-label={forumText.onMap[locale]} />
          )}
          <Count
            icon={
              <ThumbsUp
                className={cn('h-4 w-4', post.likedByMe && 'fill-current')}
                aria-hidden="true"
              />
            }
            value={post.likeCount}
            highlighted={post.likedByMe}
          />
          <Count
            icon={<MessageCircle className="h-4 w-4" aria-hidden="true" />}
            value={post.commentCount}
          />
          <Count
            icon={<ImageIcon className="h-4 w-4" aria-hidden="true" />}
            value={post.imageCount}
          />
        </span>
      </span>
    </Link>
  </li>
);
