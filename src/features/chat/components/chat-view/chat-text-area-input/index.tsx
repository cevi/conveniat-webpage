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

const sendLabel: StaticTranslationString = {
  de: 'Senden',
  en: 'Send',
  fr: 'Envoyer',
};

const cancelQuoteText: StaticTranslationString = {
  de: 'Zitat entfernen',
  en: 'Remove quote',
  fr: 'Retirer la citation',
};

const messageNotFoundText: StaticTranslationString = {
  de: 'Nachricht nicht gefunden',
  en: 'Message not found',
  fr: 'Message introuvable',
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
    sendText,
    takeMessage,
    restoreMessage,
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
    // anything else is a server message that already comes in the user's language
    return error;
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

  // One send with an attachment at a time: a second Enter during the upload would send the
  // image twice.
  const isSendingReference = React.useRef(false);

  /** Uploads and sends the staged image, if any; false when that failed. */
  const sendStagedImage = async (): Promise<boolean> => {
    if (stagedImage === undefined) return true;
    const isUploaded = await uploadImage(stagedImage.file, activeThreadId);
    setHasUploadFailed(!isUploaded);
    if (isUploaded) clearStagedImage();
    return isUploaded;
  };

  // The image goes first, then the text as its own message. The text is taken out of the
  // composer when send is pressed, so what is typed during the upload stays for the next
  // message; a failed upload puts it back next to the still-staged image.
  const sendWithAttachment = async (): Promise<void> => {
    if (stagedImage === undefined) {
      handleSendMessage();
      return;
    }
    if (isSendingReference.current) return;
    isSendingReference.current = true;
    const text = takeMessage();
    try {
      if (await sendStagedImage()) {
        if (text !== '') sendText(text);
      } else {
        restoreMessage(text);
      }
    } finally {
      isSendingReference.current = false;
    }
  };

  const isTooLong = messageLength > MAX_MESSAGE_LENGTH;
  const isNearLimit = messageLength > MAX_MESSAGE_LENGTH * 0.8;

  const handleSplitAndSend = async (): Promise<void> => {
    if (isSendingReference.current) return;
    isSendingReference.current = true;
    const message = takeMessage();
    try {
      if (!(await sendStagedImage())) {
        restoreMessage(message);
        return;
      }
      sendInChunks(message);
    } finally {
      isSendingReference.current = false;
    }
  };

  const sendInChunks = (message: string): void => {
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
        parentId: activeThreadId,
        messageId: generateMessageId(),
      });
    }
  };

  if (isGuest && !isAllowedGuestThreadReplies) {
    if (chatDetails?.type === ChatType.ANNOUNCEMENT) {
      return (
        <div className="bg-quiet flex w-full items-center justify-center gap-3 rounded-[14px] p-4 text-center">
          <Megaphone className="h-5 w-5 shrink-0 text-green-700" aria-hidden="true" />
          <span className="text-sm font-medium text-balance text-green-700">
            {isAnnouncementChannelMessage[locale]}
          </span>
        </div>
      );
    }
    return (
      <div className="p-2 text-center text-sm text-balance text-green-700">
        {isGuestMessage[locale]}
      </div>
    );
  }

  if (chatDetails?.archivedAt !== null) {
    return (
      <div className="p-2 text-center text-sm text-balance text-green-700">
        {chatIsArchivedMessage[locale]}
      </div>
    );
  }

  if (isGlobalMessagingDisabled) {
    return (
      <div className="bg-quiet flex w-full items-center justify-center rounded-[14px] p-4 text-center text-sm text-green-700">
        {messagingDisabledText[locale]}
      </div>
    );
  }

  if (!canSendMessagesInChat) {
    const isEmergency = chatDetails.type === ChatType.EMERGENCY;
    return (
      <div
        className={cn(
          'flex w-full items-center justify-center rounded-[14px] p-4 text-center text-sm',
          // red belongs to Notfall, so only the locked emergency chat keeps it
          isEmergency ? 'border border-red-100 bg-red-50 text-red-700' : 'bg-quiet text-green-700',
        )}
      >
        {isEmergency ? emergencyLockedText[locale] : chatLockedText[locale]}
      </div>
    );
  }

  const localizedError = getLocalizedError(sendError);

  return (
    <div className="group flex flex-col gap-1">
      {/* Error message when sending fails */}
      {localizedError !== undefined && localizedError !== '' && (
        <div
          className="bg-quiet rounded-xl px-3 py-2 text-sm font-semibold text-green-900"
          role="alert"
        >
          {localizedError}
        </div>
      )}

      {/* Quote Preview */}
      {quotedMessageId !== undefined && quotedMessageId !== '' && (
        <QuotedMessagePreview messageId={quotedMessageId} onCancel={cancelQuote} />
      )}

      {/* Character count warning */}
      {isNearLimit && (
        <div className={cn('text-live-text px-2 text-right text-xs', isTooLong && 'font-semibold')}>
          {messageLength}/{MAX_MESSAGE_LENGTH}
          {isTooLong && ` - ${messageTooLongText[locale]}`}
        </div>
      )}

      <div className="border-line focus-within:ring-conveniat-green flex flex-col rounded-[12px] border bg-white focus-within:ring-2">
        {/* Staged attachment sits above the text it will be sent with */}
        {stagedImage !== undefined && (
          <div className="flex items-end gap-3 px-3 pt-3">
            <div className="relative">
              <img
                src={stagedImage.previewUrl}
                alt=""
                className={cn(
                  'ring-line h-20 w-20 rounded-xl object-cover ring-1',
                  isUploading && 'opacity-60',
                  hasUploadFailed && 'ring-live ring-2',
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
                className="absolute -top-3.5 -right-3.5 flex h-11 w-11 cursor-pointer items-center justify-center"
              >
                <span className="bg-heading flex h-6 w-6 items-center justify-center rounded-full text-white ring-2 ring-white">
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </button>
            </div>
            {hasUploadFailed && (
              <span className="text-live-text pb-1 text-xs font-semibold">
                {uploadFailedText[locale]}
              </span>
            )}
          </div>
        )}
        {/* One inset on every side, and a line of text exactly as tall as the 44px buttons: a
            single line sits on the buttons' centre, and as the field grows they stay at its foot.
            It has the 12px radius and the focus ring of every field in field.ts; the buttons' 8px
            is that less the 4px inset, so the corners stay concentric. */}
        <div className="flex items-end gap-[4px] p-[4px]">
          {canUploadPictures && (
            <div>
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
                className="h-[44px] w-[44px] shrink-0 cursor-pointer rounded-[8px] text-green-700 hover:bg-transparent [&_svg]:size-5"
              >
                <Paperclip aria-hidden="true" />
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
              // px, not rem: the root font is larger on desktop, and the line has to match the
              // buttons, which are 44px everywhere
              className="block w-full resize-none [scrollbar-width:thin] border-0 bg-transparent px-2 py-[10px] text-[16px] leading-[24px] text-green-900 placeholder:text-green-500 focus:ring-0 focus:outline-none"
              rows={1}
              enterKeyHint="send"
              // five lines, then the textarea scrolls instead of eating the conversation
              style={{ minHeight: '44px', maxHeight: '140px' }}
              aria-label={messagePlaceholder[locale]}
            />
          </div>

          {/* Send button, at the foot of the field however tall it grows */}
          <div>
            {isTooLong ? (
              <Button
                onClick={() => void handleSplitAndSend()}
                size="sm"
                className="bg-live h-[44px] shrink-0 rounded-[8px] px-4 font-semibold text-white"
              >
                {splitAndSendText[locale]}
              </Button>
            ) : (
              <Button
                onClick={() => void sendWithAttachment()}
                size="icon"
                variant="ghost"
                aria-label={sendLabel[locale]}
                className="bg-conveniat-green disabled:bg-quiet h-[44px] w-[44px] shrink-0 rounded-[8px] text-white hover:bg-green-700 disabled:text-green-500 disabled:opacity-100 [&_svg]:size-5"
                disabled={stagedImage === undefined ? isSendButtonDisabled : isUploading}
              >
                <Send aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* keyboard hint only where there is a keyboard, and only while typing */}
      <p className="hidden px-4 text-[11px] text-green-500 pointer-fine:group-focus-within:block">
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
    if (!message) return messageNotFoundText[locale];

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
    <div className="bg-quiet flex items-center justify-between rounded-xl py-1 pr-0.5 pl-3 text-xs">
      <div className="border-conveniat-green flex flex-1 items-center gap-3 overflow-hidden border-l-[3px] pl-3">
        <div className="flex flex-col overflow-hidden">
          <span className="text-conveniat-green text-[11px] font-bold tracking-[0.08em] uppercase">
            {replyingToText[locale]}
          </span>
          <span className="truncate text-[13px] text-green-700">{truncatedSnippet}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={onCancel}
        aria-label={cancelQuoteText[locale]}
        className="ml-2 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-green-700"
      >
        <X className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );
};
