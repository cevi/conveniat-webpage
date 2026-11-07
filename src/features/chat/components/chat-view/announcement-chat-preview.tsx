'use client';

import { AppFooterController } from '@/components/footer/hide-footer-context';
import type { ChatMessage } from '@/features/chat/api/types';
import {
  ChatComposerBar,
  chatScreenClassName,
} from '@/features/chat/components/chat-view/chat-client-component';
import { BackLink, ChatHeaderBar } from '@/features/chat/components/chat-view/chat-header';
import { AnnouncementComposerNotice } from '@/features/chat/components/chat-view/chat-text-area-input';
import { DayLabel } from '@/features/chat/components/chat-view/day-label';
import {
  MessageBubble,
  MessageRow,
} from '@/features/chat/components/chat-view/message/message-bubble';
import { ChatIdProvider } from '@/features/chat/context/chat-id-context';
import { ChatType, MessageEventType, MessageType } from '@/lib/prisma/enums';
import type { Locale } from '@/types/types';
import type { JsonObject } from '@prisma/client/runtime/client';
import type React from 'react';

interface AnnouncementChatPreviewProperties {
  /** The channel's public name, as members see it above the chat. */
  chatName: string;
  /** The payload the announcement will be stored with, one entry per language. */
  messagePayload: JsonObject;
  /** When the message shows as sent: its publication, its schedule, or now for a draft. */
  sentAt: string;
  locale: Locale;
}

/**
 * The announcement channel as a member opens it on the phone, with the announcement as its
 * latest message. Drawn by the chat's own header, day label, bubble and composer notice, without
 * their queries: the preview has no chat to load, only the payload the announcement would be
 * stored with.
 */
export const AnnouncementChatPreview: React.FC<AnnouncementChatPreviewProperties> = ({
  chatName,
  messagePayload,
  sentAt,
  locale,
}) => {
  const message: ChatMessage = {
    id: 'announcement-preview',
    createdAt: new Date(sentAt),
    messagePayload,
    senderId: undefined,
    status: MessageEventType.STORED,
    type: MessageType.TEXT_MSG,
  };

  return (
    // the image viewer reads a chat id; announcement images need none to load
    <ChatIdProvider chatId="">
      <div className={chatScreenClassName}>
        <AppFooterController hideAppFooter />

        <ChatHeaderBar
          chat={{ id: '', name: chatName, chatType: ChatType.ANNOUNCEMENT }}
          // shown, but the preview stays on the announcement
          back={
            <div inert className="contents">
              <BackLink />
            </div>
          }
          hasMemberLine={false}
        />

        <div className="flex-1 overflow-y-auto px-2 py-4">
          <DayLabel date={message.createdAt} locale={locale} />
          <MessageRow isCurrentUser={false} isGroup={false} className="mt-3">
            <MessageBubble message={message} isCurrentUser={false} locale={locale} showMeta />
          </MessageRow>
        </div>

        <ChatComposerBar>
          <AnnouncementComposerNotice locale={locale} />
        </ChatComposerBar>
      </div>
    </ChatIdProvider>
  );
};
