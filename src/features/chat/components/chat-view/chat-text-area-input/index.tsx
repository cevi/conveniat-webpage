// hooks/use-message-input-logic.ts
import { Button } from '@/components/ui/buttons/button';
import { useMessageInput } from '@/features/chat/components/chat-view/chat-text-area-input/hooks/use-message-input';
import { useStagedImage } from '@/features/chat/components/chat-view/chat-text-area-input/hooks/use-staged-image';
import { useChatActions } from '@/features/chat/context/chat-actions-context';
import { useChatId } from '@/features/chat/context/chat-id-context';
import { useChatDetail } from '@/features/chat/hooks/use-chats';
import { useImageUpload } from '@/features/chat/hooks/use-image-upload';
import { useMessageSend } from '@/features/chat/hooks/use-message-send';
import { generateMessageId } from '@/features/chat/utils';
import { ChatCapability, ChatStatus } from '@/lib/chat-shared';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { ChatMembershipPermission, ChatType } from '@prisma/client';
import { Megaphone, Paperclip, Send, X } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import React from 'react';

const MAX_MESSAGE_LENGTH = 2000;

const messagePlaceholder: StaticTranslationString = {
  de: 'Nachricht eingeben...',
  en: 'Type a message...',
  fr: 'Tapez un message...',
};

const enterToSendHint: StaticTranslationString = {
  de: 'Enter zum Senden, Shift + Enter für eine neue Zeile',
  en: 'Enter to send, Shift + Enter for a new line',
  fr: 'Entrée pour envoyer, Maj + Entrée pour un saut de ligne',
};

const removeAttachmentText: StaticTranslationString = {
  de: 'Bild entfernen',
  en: 'Remove image',
  fr: "Retirer l'image",
};

const uploadFailedText: StaticTranslationString = {
  de: 'Hochladen fehlgeschlagen. Nochmals senden?',
  en: 'Upload failed. Send again?',
  fr: 'Échec du téléversement. Renvoyer ?',
};

const attachImageText: StaticTranslationString = {
  de: 'Bild anhängen',
  en: 'Attach image',
  fr: 'Joindre une image',
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

const isAnnouncementChannelMessage: StaticTranslationString = {
  de: 'Dies ist ein Ankündigungskanal. Du kannst hier keine Nachrichten senden.',
  en: 'This is an announcement channel. You cannot send messages here.',
  fr: "Il s'agit d'un canal d'annonces. Vous ne pouvez pas envoyer de messages ici.",
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

const emergencyLockedText: StaticTranslationString = {
  de: 'Dieser Notfall wurde als abgeschlossen markiert. Es können keine Nachrichten mehr gesendet werden.',
  en: 'This emergency alert has been marked as completed. No further messages can be sent.',
  fr: "Cette alerte d'urgence a été marquée comme terminée. Plus aucun message ne peut être envoyé.",
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
  const { activeThreadId, quotedMessageId, cancelQuote } = useChatActions();

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
    sendError,
  } = useMessageInput();

  const getLocalizedError = (error: string | undefined): string | undefined => {
    if (error === undefined || error === '') return undefined;
    if (error.includes('disabled')) {
      if (chatDetails?.type === ChatType.EMERGENCY) {
        return emergencyLockedText[locale];
      }
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

  const hasThreadsCapability = chatDetails?.capabilities.includes(ChatCapability.THREADS) ?? false;

  const hasThreadRepliesCapability =
    chatDetails?.capabilities.includes(ChatCapability.THREAD_REPLIES) ?? false;

  // Guests are allowed to type/send if they are currently replying inside a thread view,
  // AND the chat has both THREADS and THREAD_REPLIES capabilities enabled.
  const isAllowedGuestThreadReplies =
    isGuest && !!activeThreadId && hasThreadsCapability && hasThreadRepliesCapability;

  const canUploadPictures =
    chatDetails?.capabilities.includes(ChatCapability.PICTURE_UPLOAD) ?? false;

  const canSendMessagesInChat =
    (chatDetails?.capabilities.includes(ChatCapability.CAN_SEND_MESSAGES) ?? true) &&
    chatDetails?.status !== ChatStatus.CLOSED;

  const { uploadImage, isUploading } = useImageUpload({ chatId });
  const { stagedImage, stageImage, clearStagedImage } = useStagedImage();
  const [hasUploadFailed, setHasUploadFailed] = React.useState(false);

  // Picking an image only stages it above the text; it is sent together with the text.
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (file) {
      setHasUploadFailed(false);
      stageImage(file);
    }
    // reset so picking the same file again still fires a change
    if (fileInputReference.current) fileInputReference.current.value = '';
  };

  // The image goes first, then the text as its own message. A failed upload keeps both in
  // the composer, so nothing typed or picked is lost.
  const sendWithAttachment = async (): Promise<void> => {
    if (stagedImage !== undefined) {
      const isUploaded = await uploadImage(stagedImage.file);
      setHasUploadFailed(!isUploaded);
      if (!isUploaded) return;
      clearStagedImage();
    }
    handleSendMessage();
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
        messageId: generateMessageId(),
      });
    }

    // Clear the input
    textareaProps.onChange({ target: { value: '' } } as React.ChangeEvent<HTMLTextAreaElement>);
  };

  if (isGuest && !isAllowedGuestThreadReplies) {
    if (chatDetails?.type === ChatType.ANNOUNCEMENT) {
      return (
        <div className="flex w-full items-center justify-center gap-3 rounded-xl bg-gray-50 p-4 text-center">
          <Megaphone className="h-5 w-5 shrink-0 text-gray-400" />
          <span className="font-body text-sm font-medium text-balance text-gray-500">
            {isAnnouncementChannelMessage[locale]}
          </span>
        </div>
      );
    }
    return <div className="text-balance text-gray-500">{isGuestMessage[locale]}</div>;
  }

  if (chatDetails?.archivedAt !== null) {
    return <div className="text-balance text-gray-500">{chatIsArchivedMessage[locale]}</div>;
  }

  if (isGlobalMessagingDisabled) {
    return (
      <div className="flex w-full items-center justify-center rounded-lg bg-gray-100 p-4 text-center text-sm text-gray-500">
        {messagingDisabledText[locale]}
      </div>
    );
  }

  if (!canSendMessagesInChat) {
    const isEmergency = chatDetails.type === ChatType.EMERGENCY;
    return (
      <div className="flex w-full items-center justify-center rounded-lg border border-red-100 bg-red-50 p-4 text-center text-sm text-red-600">
        {isEmergency ? emergencyLockedText[locale] : chatLockedText[locale]}
      </div>
    );
  }

  const localizedError = getLocalizedError(sendError);

  return (
    <div className="group flex flex-col gap-1">
      {/* Error message when sending fails */}
      {localizedError !== undefined && localizedError !== '' && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {localizedError}
        </div>
      )}

      {/* Quote Preview */}
      {quotedMessageId !== undefined && quotedMessageId !== '' && (
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

      <div className="flex flex-col rounded-[24px] border border-gray-200 bg-white shadow-sm focus-within:border-gray-300 focus-within:ring-0">
        {/* Staged attachment sits above the text it will be sent with */}
        {stagedImage !== undefined && (
          <div className="flex items-end gap-3 px-3 pt-3">
            <div className="relative">
              <img
                src={stagedImage.previewUrl}
                alt=""
                className={cn(
                  'h-20 w-20 rounded-xl object-cover ring-1 ring-gray-200',
                  isUploading && 'opacity-60',
                  hasUploadFailed && 'ring-2 ring-red-300',
                )}
              />
              <button
                type="button"
                onClick={() => {
                  setHasUploadFailed(false);
                  clearStagedImage();
                }}
                disabled={isUploading}
                aria-label={removeAttachmentText[locale]}
                className="absolute -top-2 -right-2 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-gray-700 text-white shadow-sm ring-2 ring-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            {hasUploadFailed && (
              <span className="font-body pb-1 text-xs text-red-600">
                {uploadFailedText[locale]}
              </span>
            )}
          </div>
        )}
        <div className="flex items-end">
          {canUploadPictures && (
            <div className="mb-1 ml-1 pb-1">
              <input
                type="file"
                ref={fileInputReference}
                className="hidden"
                accept="image/*"
                onChange={handleFileSelect}
              />
              <Button
                onClick={() => fileInputReference.current?.click()}
                aria-label={attachImageText[locale]}
                size="icon"
                variant="ghost"
                className="h-10 w-10 shrink-0 cursor-pointer rounded-full text-gray-500 hover:bg-transparent"
              >
                <Paperclip size={20} />
              </Button>
            </div>
          )}
          {/* Input box */}
          <div className="flex-1">
            <textarea
              {...textareaProps}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void sendWithAttachment();
                }
              }}
              placeholder={messagePlaceholder[locale]}
              className="font-body w-full resize-none border-0 bg-transparent px-3 py-3 text-base placeholder:text-gray-500 focus:ring-0 focus:outline-none"
              rows={1}
              enterKeyHint="send"
              // five lines, then the textarea scrolls instead of eating the conversation
              style={{ minHeight: '48px', maxHeight: '144px' }}
              aria-label={messagePlaceholder[locale]}
            />
          </div>

          {/* Send button - sticky at bottom */}
          <div className="mr-1 mb-1 pb-1">
            {isTooLong ? (
              <Button
                onClick={handleSplitAndSend}
                size="sm"
                className="mb-1 h-8 shrink-0 rounded-[16px] bg-orange-500 px-4 text-white shadow-sm hover:bg-orange-600"
              >
                {splitAndSendText[locale]}
              </Button>
            ) : (
              <Button
                onClick={() => void sendWithAttachment()}
                size="icon"
                variant="ghost"
                className="text-cevi-blue h-10 w-10 shrink-0 rounded-full hover:bg-transparent hover:text-blue-700 disabled:bg-transparent disabled:text-gray-300"
                disabled={stagedImage === undefined ? isSendButtonDisabled : isUploading}
              >
                <Send size={20} />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* keyboard hint only where there is a keyboard, and only while typing */}
      <p className="font-body hidden px-4 text-[11px] text-gray-400 pointer-fine:group-focus-within:block">
        {enterToSendHint[locale]}
      </p>
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
        className="ml-4 shrink-0 rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
