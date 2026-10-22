'use client';

import { PersonAvatar } from '@/components/ui/person-avatar';
import type { ChatMessage } from '@/features/chat/api/types';
import { useChatId } from '@/features/chat/context/chat-id-context';
import { formatLastReplyTime } from '@/features/chat/utils/thread-summary';
import { trpc } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { ChevronRight } from 'lucide-react';
import type React from 'react';

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

/**
 * The quiet row under a message that has replies: the people who replied, how many replies,
 * the time of the last one, and a way into the thread. Who replied and when come with the
 * message, see `findThreadSummaries`; a message restored from an older cache shows its count.
 */
export const ThreadSummary: React.FC<{
  message: ChatMessage;
  replyCount: number;
  hasUnreadReplies: boolean;
  locale: Locale;
  onOpen: () => void;
}> = ({ message, replyCount, hasUnreadReplies, locale, onOpen }) => {
  const chatId = useChatId();
  // a picture the live update could not know yet is still in the chat's member list
  const { data: chatDetails } = trpc.chat.chatDetails.useQuery({ chatId }, { enabled: false });
  const summary = message.threadSummary;
  const repliers = Array.isArray(summary?.repliers) ? summary.repliers : [];
  const latestTime =
    summary?.lastReplyAt === undefined
      ? ''
      : formatLastReplyTime(summary.lastReplyAt, locale, new Date());

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
          {repliers.map((replier) => (
            <PersonAvatar
              key={replier.id}
              seed={replier.id}
              name={replier.name}
              pictureUrl={
                replier.pictureUrl ??
                chatDetails?.participants.find((participant) => participant.id === replier.id)
                  ?.pictureUrl
              }
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
