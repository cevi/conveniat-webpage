// hooks/use-message-input-logic.ts
import { Button } from '@/components/ui/buttons/button';
import { useMessageInput } from '@/features/chat/components/chat-view/chat-text-area-input/hooks/use-message-input';
import { useChatActions } from '@/features/chat/context/chat-actions-context';
import { useChatId } from '@/features/chat/context/chat-id-context';
import { useChatDetail } from '@/features/chat/hooks/use-chats';
import { useImageUpload } from '@/features/chat/hooks/use-image-upload';
import { useMessageSend } from '@/features/chat/hooks/use-message-send';
import { ChatCapability } from '@/lib/chat-shared';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { ChatMembershipPermission } from '@prisma/client';
import { Paperclip, Send, X } from 'lucide-react';
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

const messagingDisabledText: StaticTranslationString = {
  de: 'Nachrichten sind derzeit deaktiviert.',
  en: 'Messaging is currently disabled.',
  fr: 'La messagerie est actuellement désactivée.',
};

const replyingToText: StaticTranslationString = {
  de: 'Antwort auf',
  en: 'Replying to',
  fr: 'En réponse à',
};

const chatLockedText: StaticTranslationString = {
  de: 'Dieser Chat wurde geschlossen. Es können keine Nachrichten mehr gesendet werden.',
  en: 'This chat has been locked. No further messages can be sent.',
  fr: 'Ce chat a été verrouillé. Plus aucun message ne peut être envoyé.',
};

const sendErrorMessageText: StaticTranslationString = {
  de: 'Nachricht konnte nicht gesendet werden. Bitte versuche es erneut.',
  en: 'Failed to send message. Please try again.',
  fr: "Échec de l'envoi du message. Veuillez réessayer.",
};

const messagingDisabledErrorText: StaticTranslationString = {
  de: 'Nachrichten sind derzeit deaktiviert. Bitte versuche es später erneut.',
  en: 'Messaging is currently disabled. Please try again later.',
  fr: 'La messagerie est actuellement désactivée. Veuillez réessayer plus tard.',
};

export const ChatTextAreaInput: React.FC = () => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const fileInputReference = React.useRef<HTMLInputElement>(null);
  const { quotedMessageId, cancelQuote } = useChatActions();

  const { data: currentUser } = trpc.chat.user.useQuery({});
  const chatId = useChatId();
  const { data: chatDetails } = useChatDetail(chatId);

  const sendMessageMutation = useMessageSend();

  const {
    textareaProps,
    handleSendMessage,
    isSendButtonDisabled,
    messageLength,
    isGlobalMessagingDisabled,
    isOpenEmergencyOrSupportChat,
    sendError,
  } = useMessageInput();

  const getLocalizedError = (error: string | undefined): string | undefined => {
    if (!error) return undefined;
    if (error.includes('disabled')) {
      return messagingDisabledErrorText[locale];
    }
    return sendErrorMessageText[locale];
  };

  const isGuest =
    chatDetails?.participants.some(
      (participant: { id: string; chatPermission: ChatMembershipPermission }) =>
        participant.id === currentUser &&
        participant.chatPermission === ChatMembershipPermission.GUEST,
    ) ?? false;

  const canUploadPictures =
    chatDetails?.capabilities.includes(ChatCapability.PICTURE_UPLOAD) ?? false;

  const canSendMessagesInChat =
    chatDetails?.capabilities.includes(ChatCapability.CAN_SEND_MESSAGES) ?? true;

  const { uploadImage } = useImageUpload({
    chatId,
    onError: (error) => {
      // TODO: Show toast
      console.error('Failed to upload image:', error);
    },
  });

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await uploadImage(file);
    } catch {
      // Error handled in hook
    }

    // Reset input
    if (fileInputReference.current) {
      fileInputReference.current.value = '';
    }
  };

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
    return <div className="text-balance text-gray-500">{isGuestMessage[locale]}</div>;
  }

  if (chatDetails?.archivedAt !== null) {
    return <div className="text-balance text-gray-500">{chatIsArchivedMessage[locale]}</div>;
  }

  if (!isOpenEmergencyOrSupportChat && isGlobalMessagingDisabled) {
    return (
      <div className="flex w-full items-center justify-center rounded-lg bg-gray-100 p-4 text-center text-sm text-gray-500">
        {messagingDisabledText[locale]}
      </div>
    );
  }

  if (!canSendMessagesInChat && !isOpenEmergencyOrSupportChat) {
    return (
      <div className="flex w-full items-center justify-center rounded-lg border border-red-100 bg-red-50 p-4 text-center text-sm text-red-600">
        {chatLockedText[locale]}
      </div>
    );
  }

  const localizedError = getLocalizedError(sendError);

  return (
    <div className="flex flex-col gap-1">
      {/* Error message when sending fails */}
      {localizedError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {localizedError}
        </div>
      )}

      {/* Quote Preview */}
      {quotedMessageId && (
        <QuotedMessagePreview messageId={quotedMessageId} onCancel={cancelQuote} />
      )}

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
        {canUploadPictures && (
          <>
            <input
              type="file"
              ref={fileInputReference}
              className="hidden"
              accept="image/*"
              onChange={(event) => {
                void handleFileSelect(event);
              }}
            />
            <Button
              onClick={() => fileInputReference.current?.click()}
              size="icon"
              variant="outline"
              className="h-10 w-10 shrink-0 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            >
              <Paperclip className="h-5 w-5" />
            </Button>
          </>
        )}
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
            disabled={isSendButtonDisabled && !isOpenEmergencyOrSupportChat}
          >
            {splitAndSendText[locale]}
          </Button>
        ) : (
          <Button
            onClick={handleSendMessage}
            size="icon"
            className="h-10 w-10 shrink-0 rounded-full bg-green-400 text-white hover:bg-green-600 disabled:bg-gray-300 disabled:text-gray-700"
            disabled={isSendButtonDisabled && !isOpenEmergencyOrSupportChat}
          >
            <Send className="h-5 w-5" />
          </Button>
        )}
      </div>
    </div>
  );
};
const QuotedMessagePreview: React.FC<{
  messageId: string;
  onCancel: () => void;
}> = ({ messageId, onCancel }) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const { data: message, isLoading } = trpc.chat.getMessage.useQuery({ messageId });

  const getSnippet = (): string => {
    if (isLoading) return '...';
    if (!message) return 'Message not found';

    const payload = message.messagePayload;
    if (typeof payload === 'string') return payload;
    const textPayload = payload as Record<string, unknown>;
    if ('text' in textPayload) {
      return String(textPayload['text']);
    }
    return '...';
  };

  const snippet = getSnippet();
  const truncatedSnippet = snippet.length > 100 ? snippet.slice(0, 100) + '...' : snippet;

  return (
    <div className="flex items-center justify-between rounded-t-xl border border-b-0 border-gray-200 bg-gray-50/80 px-4 py-2 text-xs backdrop-blur-sm">
      <div className="border-cevi-blue flex flex-1 items-center gap-3 overflow-hidden border-l-[3px] pl-3">
        <div className="flex flex-col overflow-hidden">
          <span className="text-cevi-blue text-[10px] font-bold tracking-tight uppercase">
            {replyingToText[locale]}
          </span>
          <span className="truncate text-gray-600 italic">{truncatedSnippet}</span>
        </div>
      </div>
      <button
        onClick={onCancel}
        className="cursor-pointer ml-4 shrink-0 rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
