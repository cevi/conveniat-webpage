// hooks/use-message-input-logic.ts
import { Button } from '@/components/ui/buttons/button';
import { useMessageInput } from '@/features/chat/components/chat-view/chat-textarea-input/hooks/use-message-input';
import { useChatId } from '@/features/chat/context/chat-id-context';
import { useChatDetail } from '@/features/chat/hooks/use-chats';
import { ChatMembershipPermission } from '@/lib/prisma';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { Send } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import React from 'react';

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

export const ChatTextareaInput: React.FC = () => {
  const locale = useCurrentLocale(i18nConfig) as Locale;

  const { data: currentUser } = trpc.chat.user.useQuery({});
  const chatId = useChatId();
  const { data: chatDetails } = useChatDetail(chatId);
  const { textareaProps, handleSendMessage, isSendButtonDisabled } = useMessageInput();

  const isGuest =
    chatDetails?.participants.some(
      (participant) =>
        participant.id === currentUser &&
        participant.chatPermission === ChatMembershipPermission.GUEST,
    ) ?? false;

  if (isGuest) {
    return <div className="text-gray-500">{isGuestMessage[locale]}</div>;
  }

  if (chatDetails?.isArchived === true) {
    return <div className="text-gray-500">{chatIsArchivedMessage[locale]}</div>;
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-2 shadow-sm">
      <textarea
        {...textareaProps}
        placeholder={messagePlaceholder[locale]}
        className="font-body flex-1 resize-none rounded-lg border-0 bg-transparent py-2 pr-10 pl-3 placeholder:text-gray-500 focus:shadow-none focus:ring-0 focus:ring-offset-0 focus:outline-none"
        rows={1}
        style={{ minHeight: '40px', maxHeight: '250px' }}
        aria-label={messagePlaceholder[locale]}
      />
      <Button
        onClick={handleSendMessage}
        size="icon"
        className="h-10 w-10 rounded-full bg-green-400 text-green-900 hover:bg-green-600 disabled:bg-gray-300 disabled:text-gray-700"
        disabled={isSendButtonDisabled}
      >
        <Send className="h-5 w-5" />
      </Button>
    </div>
  );
};
