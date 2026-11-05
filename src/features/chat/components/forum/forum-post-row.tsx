import { ForumStatusPill } from '@/features/chat/components/forum/forum-status-pill';
import { forumText, relativeTimeText } from '@/features/chat/components/forum/forum-texts';
import type { ForumPostSummary } from '@/lib/forum-shared';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Clock, Image as ImageIcon, MapPin, MessageCircle, ThumbsUp } from 'lucide-react';
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
}> = ({ post, locale, showTopic, now }) => (
  <li>
    <Link
      href={`/app/forum/${post.id}`}
      className="focus-visible:focus-surface hover:bg-quiet/60 flex flex-col gap-1.5 px-4 py-3 transition-colors"
    >
      <span className="flex flex-wrap items-center gap-1.5 text-[12px] text-green-700">
        {post.pending === true ? (
          <span className="border-line inline-flex h-[22px] items-center gap-1 rounded-full border border-dashed bg-white px-2 text-[12px] font-semibold text-green-700">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            {forumText.pendingPill[locale]}
          </span>
        ) : (
          <ForumStatusPill status={post.status} locale={locale} />
        )}
        {post.byTopicAdmin && (
          <span className="bg-conveniat-green rounded-[5px] px-1.5 py-px text-[11px] font-bold text-white">
            {forumText.kernteam[locale]}
          </span>
        )}
        {post.location !== null && (
          <span className="bg-tint inline-flex items-center gap-1 rounded-md px-1.5 py-px text-green-800">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            {forumText.onMap[locale]}
          </span>
        )}
        {showTopic && <span className="truncate">{post.topicName}</span>}
      </span>
      <span className="font-heading text-heading text-[15px] leading-snug font-bold">
        {post.title}
      </span>
      {post.excerpt !== '' && (
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
        <span className="ml-auto truncate font-normal text-green-600">
          {post.author?.name ?? ''} · {relativeTimeText(new Date(post.createdAt), locale, now)}
        </span>
      </span>
    </Link>
  </li>
);
