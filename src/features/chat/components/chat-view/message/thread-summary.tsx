'use client';

import { PersonAvatar } from '@/components/ui/person-avatar';
import type { ChatMessage } from '@/features/chat/api/types';
import { CHAT_PAGE_SIZE } from '@/features/chat/constants';
import { useChatId } from '@/features/chat/context/chat-id-context';
import { formatMessageTimeOnlyRaw } from '@/features/chat/hooks/use-format-date';
import { trpc } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { ChevronRight } from 'lucide-react';
import type React from 'react';
import { useMemo } from 'react';

export const repliesCountText = (count: number, locale: Locale): string => {
  if (count === 1) {
    if (locale === 'de') return '1 Antwort';
    if (locale === 'fr') return '1 réponse';
    return '1 reply';
  }
  if (locale === 'de') return `${count} Antworten`;
  if (locale === 'fr') return `${count} réponses`;
  return `${count} replies`;
};

const lastReplyText = (time: string, locale: Locale): string => {
  if (locale === 'de') return `zuletzt ${time}`;
  if (locale === 'fr') return `dernière ${time}`;
  return `last ${time}`;
};

/** How many of the people who replied get a small avatar. */
const SHOWN_REPLIERS = 3;

/**
 * Who replied in a thread and when last, read from the replies already in the cache: the
 * messages list only counts the replies, and fetching every thread of the list to name its
 * people would cost a request per thread. A thread opened once, here or on an earlier day,
 * shows them; one never opened shows its count.
 */
const useCachedThreadReplies = (threadId: string): ChatMessage[] => {
  const chatId = useChatId();
  const { data } = trpc.chat.infiniteMessages.useInfiniteQuery(
    { chatId, limit: CHAT_PAGE_SIZE, parentId: threadId },
    {
      // a reader of the cache only: never fetches, and an invalidation does not refetch it
      enabled: false,
      getNextPageParam: (lastPage): string | undefined => lastPage.nextCursor ?? undefined,
    },
  );
  return useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data]);
};

/**
 * The quiet row under a message that has replies: the people who replied, how many replies,
 * the time of the last one, and a way into the thread.
 */
export const ThreadSummary: React.FC<{
  message: ChatMessage;
  replyCount: number;
  hasUnreadReplies: boolean;
  locale: Locale;
  onOpen: () => void;
}> = ({ message, replyCount, hasUnreadReplies, locale, onOpen }) => {
  const replies = useCachedThreadReplies(message.id);

  // the pages run from the newest reply to the oldest
  const latestReply = replies[0];
  const repliers = useMemo(() => {
    const seen = new Map<string, string>();
    for (const reply of replies) {
      if (typeof reply.senderId === 'string' && !seen.has(reply.senderId)) {
        seen.set(reply.senderId, reply.senderName ?? '');
      }
    }
    return [...seen].slice(0, SHOWN_REPLIERS);
  }, [replies]);

  const latestTime =
    latestReply === undefined ? '' : formatMessageTimeOnlyRaw(latestReply.createdAt, locale);

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onOpen();
      }}
      className="bg-quiet hover:bg-chip mt-1 flex min-h-11 max-w-full cursor-pointer items-center gap-2 rounded-[12px] py-1.5 pr-2 pl-2.5 text-left text-[13px]"
    >
      {repliers.length > 0 && (
        <span className="flex shrink-0 -space-x-1.5" aria-hidden="true">
          {repliers.map(([senderId, name]) => (
            <PersonAvatar
              key={senderId}
              seed={senderId}
              name={name}
              className="font-body h-6 w-6 text-[9px] ring-2 ring-white"
            />
          ))}
        </span>
      )}
      {hasUnreadReplies && (
        <span className="bg-conveniat-green h-2 w-2 shrink-0 rounded-full" aria-hidden="true" />
      )}
      <span className="font-semibold whitespace-nowrap text-green-900">
        {repliesCountText(replyCount, locale)}
      </span>
      {latestTime !== '' && (
        <span className="truncate text-green-700">{lastReplyText(latestTime, locale)}</span>
      )}
      <ChevronRight className="h-4 w-4 shrink-0 text-green-700" aria-hidden="true" />
    </button>
  );
};
