// hooks/use-message-input-logic.ts
import { Button } from '@/components/ui/buttons/button';
import { formFieldClassName } from '@/components/ui/field';
import { useMessageInput } from '@/features/chat/components/chat-view/chat-text-area-input/hooks/use-message-input';
import { useStagedImage } from '@/features/chat/components/chat-view/chat-text-area-input/hooks/use-staged-image';
import { useChatActions } from '@/features/chat/context/chat-actions-context';
import { useChatId } from '@/features/chat/context/chat-id-context';
import { useChatDetail } from '@/features/chat/hooks/use-chats';
import { useImageUpload } from '@/features/chat/hooks/use-image-upload';
import { useMessageSend } from '@/features/chat/hooks/use-message-send';
import { generateMessageId } from '@/features/chat/utils';
import { isMessageDeleted } from '@/features/chat/utils/message-deletion';
import { splitDisplayName } from '@/features/chat/utils/split-display-name';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import { ChatCapability, ChatStatus } from '@/lib/chat-shared';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { ChatMembershipPermission, ChatType } from '@prisma/client';
import type { LucideIcon } from 'lucide-react';
import {
  Archive,
  Lock,
  Megaphone,
  MessageSquareOff,
  Paperclip,
  Reply,
  Send,
  X,
} from 'lucide-react';
import React from 'react';

const MAX_MESSAGE_LENGTH = 2000;

const messageToPlaceholder: StaticTranslationString = {
  de: 'Nachricht an {name}',
  en: 'Message {name}',
  fr: 'Message à {name}',
};

const messagePlaceholder: StaticTranslationString = {
  de: 'Nachricht schreiben',
  en: 'Write a message',
  fr: 'Écrire un message',
};

const threadReplyPlaceholder: StaticTranslationString = {
  de: 'Im Thread antworten',
  en: 'Reply in thread',
  fr: 'Répondre dans le fil',
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
  fr: 'Ce chat est archivé. Tu ne peux pas envoyer de messages.',
};

const isGuestMessage: StaticTranslationString = {
  de: 'Du bist ein Gast in diesem Chat. Du kannst keine Nachrichten senden.',
  en: 'You are a guest in this chat. You cannot send messages.',
  fr: 'Tu es invité·e dans ce chat. Tu ne peux pas envoyer de messages.',
};

const isAnnouncementChannelMessage: StaticTranslationString = {
  de: 'Dies ist ein Ankündigungskanal. Du kannst hier keine Nachrichten senden.',
  en: 'This is an announcement channel. You cannot send messages here.',
  fr: "Il s'agit d'un canal d'annonces. Tu ne peux pas envoyer de messages ici.",
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
  de: 'Antwort abbrechen',
  en: 'Cancel reply',
  fr: 'Annuler la réponse',
};

const deletedQuoteText: StaticTranslationString = {
  de: 'Gelöschte Nachricht',
  en: 'Deleted message',
  fr: 'Message supprimé',
};

const messageNotFoundText: StaticTranslationString = {
  de: 'Nachricht nicht gefunden',
  en: 'Message not found',
  fr: 'Message introuvable',
};

const replyingToText: StaticTranslationString = {
  de: 'Antwort an {name}',
  en: 'Replying to {name}',
  fr: 'Réponse à {name}',
};

const replyingToYourselfText: StaticTranslationString = {
  de: 'Antwort auf deine Nachricht',
  en: 'Replying to your message',
  fr: 'Réponse à ton message',
};

const replyingText: StaticTranslationString = {
  de: 'Antwort',
  en: 'Reply',
  fr: 'Réponse',
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
    return chatDetails?.type === ChatType.ANNOUNCEMENT ? (
      <ComposerNotice icon={Megaphone} text={isAnnouncementChannelMessage[locale]} />
    ) : (
      <ComposerNotice icon={Lock} text={isGuestMessage[locale]} />
    );
  }

  if (chatDetails?.archivedAt !== null) {
    return <ComposerNotice icon={Archive} text={chatIsArchivedMessage[locale]} />;
  }

  if (isGlobalMessagingDisabled) {
    return <ComposerNotice icon={MessageSquareOff} text={messagingDisabledText[locale]} />;
  }

  if (!canSendMessagesInChat) {
    // red belongs to Notfall, so only the locked emergency chat keeps it
    return chatDetails.type === ChatType.EMERGENCY ? (
      <ComposerNotice icon={Lock} text={emergencyLockedText[locale]} isEmergency />
    ) : (
      <ComposerNotice icon={Lock} text={chatLockedText[locale]} />
    );
  }

  const localizedError = getLocalizedError(sendError);
  let placeholder = messagePlaceholder[locale];
  if (activeThreadId !== undefined) placeholder = threadReplyPlaceholder[locale];
  else if (chatDetails.name !== '')
    placeholder = messageToPlaceholder[locale].replace('{name}', chatDetails.name);

  return (
    <div className="group flex flex-col gap-2">
      {/* Error message when sending fails */}
      {localizedError !== undefined && localizedError !== '' && (
        <div
          className="bg-danger-soft text-danger-text rounded-[12px] px-3 py-2 text-sm font-semibold"
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
        <div
          className={cn(
            'px-2 text-right text-xs',
            // a count while it fits, an error once it does not
            isTooLong ? 'text-danger-text font-semibold' : 'text-green-700',
          )}
        >
          {messageLength}/{MAX_MESSAGE_LENGTH}
          {isTooLong && ` - ${messageTooLongText[locale]}`}
        </div>
      )}

      {/* The field has the frame of every form field in field.ts; the send button stands
          beside it, at the foot of its last line however tall the field grows. A single line of
          text inside the 1px border is 42px, so field and button are both 44px high. */}
      <div className="flex items-end gap-2">
        <div className={cn(formFieldClassName, 'flex-1 flex-col items-stretch')}>
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
                    hasUploadFailed && 'ring-danger ring-2',
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
                  className="group absolute -top-3.5 -right-3.5 flex h-11 w-11 cursor-pointer items-center justify-center focus-visible:outline-none"
                >
                  <span className="bg-heading group-focus-visible:focus-ring flex h-6 w-6 items-center justify-center rounded-full text-white ring-2 ring-white">
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                </button>
              </div>
              {hasUploadFailed && (
                <span className="text-danger-text pb-1 text-xs font-semibold">
                  {uploadFailedText[locale]}
                </span>
              )}
            </div>
          )}
          <div className="flex items-end">
            {canUploadPictures && (
              <div>
                <input
                  type="file"
                  ref={fileInputReference}
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileSelect}
                />
                <button
                  type="button"
                  onClick={() => fileInputReference.current?.click()}
                  aria-label={attachImageText[locale]}
                  className="flex h-[42px] w-[42px] shrink-0 cursor-pointer items-center justify-center rounded-[11px] text-green-700 hover:text-green-900"
                >
                  <Paperclip className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            )}
            <textarea
              {...textareaProps}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void sendWithAttachment();
                }
              }}
              placeholder={placeholder}
              // px, not rem: the root font is larger on desktop, and the line has to match the
              // button, which is 44px everywhere
              className={cn(
                'block min-w-0 flex-1 resize-none [scrollbar-width:thin] border-0 bg-transparent py-[9px] pr-[14px] text-[16px] leading-[24px] text-green-900 outline-hidden placeholder:truncate placeholder:text-green-500',
                canUploadPictures ? 'pl-0' : 'pl-[14px]',
              )}
              rows={1}
              enterKeyHint="send"
              // five lines, then the textarea scrolls instead of eating the conversation
              style={{ minHeight: '42px', maxHeight: '138px' }}
              aria-label={placeholder}
            />
          </div>
        </div>

        {isTooLong ? (
          // the one way on from a message that is too long, so it takes the send button's place
          <Button
            onClick={() => void handleSplitAndSend()}
            variant="primary"
            className="h-[44px] shrink-0 rounded-[12px] px-4 text-[15px]"
          >
            {splitAndSendText[locale]}
          </Button>
        ) : (
          <Button
            onClick={() => void sendWithAttachment()}
            variant="primary"
            aria-label={sendLabel[locale]}
            className="disabled:bg-quiet h-[44px] w-[44px] shrink-0 rounded-[12px] p-0 disabled:text-green-500 disabled:opacity-100 [&_svg]:size-5"
            disabled={stagedImage === undefined ? isSendButtonDisabled : isUploading}
          >
            <Send aria-hidden="true" />
          </Button>
        )}
      </div>

      {/* keyboard hint only where there is a keyboard, and only while typing; its line is kept
          when hidden, so focusing the field does not push the conversation up */}
      <p className="invisible hidden px-4 text-[11px] text-green-500 pointer-fine:block pointer-fine:group-focus-within:visible">
        {enterToSendHint[locale]}
      </p>
    </div>
  );
};
/**
 * Why the composer is not there: a neutral notice with an icon, red only in a locked Notfall chat.
 */
const ComposerNotice: React.FC<{ icon: LucideIcon; text: string; isEmergency?: boolean }> = ({
  icon: Icon,
  text,
  isEmergency = false,
}) => (
  <div
    className={cn(
      'flex w-full items-center gap-3 rounded-[14px] px-4 py-3 text-sm text-balance',
      isEmergency ? 'bg-red-50 text-red-700' : 'bg-quiet text-green-700',
    )}
    data-allow-red={isEmergency ? '' : undefined}
  >
    <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
    <span>{text}</span>
  </div>
);

/**
 * What the next message answers, above the composer: whom, a line of what they wrote, and a way
 * to drop it.
 */
const QuotedMessagePreview: React.FC<{
  messageId: string;
  onCancel: () => void;
}> = ({ messageId, onCancel }) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const { data: message, isLoading } = trpc.chat.getMessage.useQuery({ messageId });
  const { data: currentUser } = trpc.chat.user.useQuery({});

  const getSnippet = (): string => {
    if (isLoading) return '…';
    if (!message) return messageNotFoundText[locale];
    if (isMessageDeleted(message)) return deletedQuoteText[locale];

    const payload = message.messagePayload;
    if (typeof payload === 'string') return payload;
    const textPayload = payload as Record<string, unknown>;
    if ('text' in textPayload) {
      return String(textPayload['text']);
    }
    return '…';
  };

  let title = replyingText[locale];
  if (message !== undefined && message.senderId === currentUser) {
    title = replyingToYourselfText[locale];
  } else if (message?.senderName !== undefined && message.senderName !== '') {
    title = replyingToText[locale].replace('{name}', splitDisplayName(message.senderName).primary);
  }

  return (
    <div className="bg-quiet flex items-center gap-3 rounded-[12px] py-1 pr-0.5 pl-3">
      <Reply className="h-5 w-5 shrink-0 text-green-700" aria-hidden="true" />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[13px] font-semibold text-green-900">{title}</span>
        <span className="truncate text-[13px] text-green-700">{getSnippet()}</span>
      </div>
      <button
        type="button"
        onClick={onCancel}
        aria-label={cancelQuoteText[locale]}
        className="hover:bg-chip flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-green-700"
      >
        <X className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );
};
