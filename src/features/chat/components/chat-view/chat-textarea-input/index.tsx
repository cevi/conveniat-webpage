// hooks/use-message-input-logic.ts
import { Button } from '@/components/ui/buttons/button';
import { useMessageInput } from '@/features/chat/components/chat-view/chat-textarea-input/hooks/use-message-input';
import { useChatId } from '@/features/chat/context/chat-id-context';
import { useChatDetail } from '@/features/chat/hooks/use-chats';
import { useMessageSend } from '@/features/chat/hooks/use-message-send';
import { ChatMembershipPermission } from '@/lib/prisma';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { Send } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import React from 'react';

const MAX_MESSAGE_LENGTH = 2000;

const messagePlaceholder: StaticTranslationString = {
  de: 'Nachricht eingeben...',
  en: 'Type a message...',
  fr: 'Tapez un message...',
};

const chatIsArchivedMessage: StaticTranslationString = {
  de: 'Dieser Chat ist archiviert. Du kannst keine Nachrichten senden.',
  en: 'This chat is archived. You cannot send messages.',
  fr: 'Ce chat est archivé. Vous ne pouvez pas envoyer de messages.',
};

const isGuestMessage: StaticTranslationString = {
  de: 'Du bist ein Gast in diesem Chat. Du kannst keine Nachrichten senden.',
  en: 'You are a guest in this chat. You cannot send messages.',
  fr: 'Vous êtes un invité dans ce chat. Vous ne pouvez pas envoyer de messages.',
};

const messageTooLongText: StaticTranslationString = {
  de: 'Nachricht zu lang',
  en: 'Message too long',
  fr: 'Message trop long',
};

const splitAndSendText: StaticTranslationString = {
  de: 'Aufteilen & Senden',
  en: 'Split & Send',
  fr: 'Diviser et envoyer',
};

export const ChatTextareaInput: React.FC = () => {
  const locale = useCurrentLocale(i18nConfig) as Locale;

  const { data: currentUser } = trpc.chat.user.useQuery({});
  const chatId = useChatId();
  const { data: chatDetails } = useChatDetail(chatId);
  const { textareaProps, handleSendMessage, isSendButtonDisabled, messageLength } =
    useMessageInput();
  const sendMessageMutation = useMessageSend();

  const isGuest =
    chatDetails?.participants.some(
      (participant) =>
        participant.id === currentUser &&
        participant.chatPermission === ChatMembershipPermission.GUEST,
    ) ?? false;

  const isTooLong = messageLength > MAX_MESSAGE_LENGTH;
  const isNearLimit = messageLength > MAX_MESSAGE_LENGTH * 0.8;

  const handleSplitAndSend = (): void => {
    const message = textareaProps.value;
    const chunks: string[] = [];

    // Split message into chunks of MAX_MESSAGE_LENGTH, trying to break at word boundaries
    let remaining = message;
    while (remaining.length > 0) {
      if (remaining.length <= MAX_MESSAGE_LENGTH) {
        chunks.push(remaining);
        break;
      }

      // Try to find a good break point (space, newline) near the limit
      let breakPoint = MAX_MESSAGE_LENGTH;
      const searchStart = Math.max(0, MAX_MESSAGE_LENGTH - 200);
      for (let index = MAX_MESSAGE_LENGTH; index >= searchStart; index--) {
        if (remaining[index] === ' ' || remaining[index] === '\n') {
          breakPoint = index;
          break;
        }
      }

      chunks.push(remaining.slice(0, breakPoint));
      remaining = remaining.slice(breakPoint).trimStart();

      // Limit to 5 messages max
      if (chunks.length >= 5) {
        if (remaining.length > 0) {
          const lastChunkIndex = chunks.length - 1;
          const lastChunk = chunks[lastChunkIndex];
          if (lastChunk !== undefined) {
            chunks[lastChunkIndex] = lastChunk + ' ' + remaining;
          }
        }
        break;
      }
    }

    // Send each chunk
    for (const chunk of chunks) {
      sendMessageMutation.mutate({
        chatId,
        content: chunk.trim(),
        timestamp: new Date(),
      });
    }

    // Clear the input
    textareaProps.onChange({ target: { value: '' } } as React.ChangeEvent<HTMLTextAreaElement>);
  };

  if (isGuest) {
    return <div className="text-gray-500">{isGuestMessage[locale]}</div>;
  }

  if (chatDetails?.archivedAt !== null) {
    return <div className="text-gray-500">{chatIsArchivedMessage[locale]}</div>;
  }

  return (
    <div className="flex flex-col gap-1">
      {/* Character count warning */}
      {isNearLimit && (
        <div
          className={`text-right text-xs ${isTooLong ? 'font-semibold text-red-500' : 'text-orange-500'}`}
        >
          {messageLength}/{MAX_MESSAGE_LENGTH}
          {isTooLong && ` - ${messageTooLongText[locale]}`}
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Input box */}
        <div className="flex-1 rounded-lg border border-gray-200 bg-white shadow-sm">
          <textarea
            {...textareaProps}
            placeholder={messagePlaceholder[locale]}
            className="font-body w-full resize-none rounded-lg border-0 bg-transparent px-3 py-2 placeholder:text-gray-500 focus:shadow-none focus:ring-0 focus:ring-offset-0 focus:outline-none"
            rows={1}
            style={{ minHeight: '40px', maxHeight: '250px' }}
            aria-label={messagePlaceholder[locale]}
          />
        </div>

        {/* Send button - sticky at bottom */}
        {isTooLong ? (
          <Button
            onClick={handleSplitAndSend}
            size="sm"
            className="h-10 shrink-0 rounded-full bg-orange-500 px-3 text-white hover:bg-orange-600"
          >
            {splitAndSendText[locale]}
          </Button>
        ) : (
          <Button
            onClick={handleSendMessage}
            size="icon"
            className="h-10 w-10 shrink-0 rounded-full bg-green-400 text-white hover:bg-green-600 disabled:bg-gray-300 disabled:text-gray-700"
            disabled={isSendButtonDisabled}
          >
            <Send className="h-5 w-5" />
          </Button>
        )}
      </div>
    </div>
  );
};
