import { Button } from '@/components/ui/buttons/button';
import { useAutoResizeTextarea } from '@/features/chat/components/chat-view/chat-text-area-input/hooks/use-auto-resize-textarea';
import { useImageUpload } from '@/features/chat/hooks/use-image-upload';
import { trpc } from '@/trpc/client';
import { Paperclip, Send } from 'lucide-react';
import React, { useRef, useState } from 'react';

interface ChatManagementInputProperties {
  chatId: string;
  onSendMessage: (content: string) => Promise<void>;
  sending: boolean;
  disabled: boolean;
  locale: string;
}

const MAX_MESSAGE_LENGTH = 2000;

const messagePlaceholder: Record<string, string> = {
  de: 'Nachricht eingeben...',
  en: 'Type a message...',
  fr: 'Tapez un message...',
};

const messageTooLongText: Record<string, string> = {
  de: 'Nachricht zu lang',
  en: 'Message too long',
  fr: 'Message trop long',
};

const splitAndSendText: Record<string, string> = {
  de: 'Aufteilen & Senden',
  en: 'Split & Send',
  fr: 'Diviser et envoyer',
};

export const ChatManagementInput: React.FC<ChatManagementInputProperties> = ({
  chatId,
  onSendMessage,
  sending,
  disabled,
  locale,
}) => {
  const trpcUtils = trpc.useUtils();
  const [newMessage, setNewMessage] = useState('');
  const fileInputReference = useRef<HTMLInputElement>(null);
  const { textareaRef, resize } = useAutoResizeTextarea(newMessage);

  const adminGetUploadUrlMutation = trpc.admin.getAdminUploadUrl.useMutation();
  const adminPostMessageMutation = trpc.admin.postAdminMessage.useMutation();

  const { uploadImage, isPending: isUploading } = useImageUpload({
    chatId,
    onSuccess: () => {
      // Refresh or handle success
      // Invalidate chat messages query
      void trpcUtils.admin.getChatMessages.invalidate({ chatId });
    },
    onError: (error) => {
      alert('Failed to upload image: ' + error.message);
    },
    uploadUrlMutation: adminGetUploadUrlMutation,
    sendMessageMutation: {
      mutate: ({ chatId: id, content, type }) =>
        adminPostMessageMutation.mutate({ chatId: id, content, type }),
      isPending: adminPostMessageMutation.isPending,
    },
  });

  // Override handleSendMessage to use the prop
  const handleSendMessage = async (): Promise<void> => {
    if (!newMessage.trim() || sending) return;
    await onSendMessage(newMessage);
    setNewMessage('');
    resize();
  };

  const handleSplitAndSend = async (): Promise<void> => {
    const message = newMessage;
    const chunks: string[] = [];
    let remaining = message;
    while (remaining.length > 0) {
      if (remaining.length <= MAX_MESSAGE_LENGTH) {
        chunks.push(remaining);
        break;
      }
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
      if (chunks.length >= 5) break;
    }

    for (const chunk of chunks) {
      await onSendMessage(chunk);
    }
    setNewMessage('');
    resize();
  };

  const messageLength = newMessage.length;
  const isTooLong = messageLength > MAX_MESSAGE_LENGTH;
  const isNearLimit = messageLength > MAX_MESSAGE_LENGTH * 0.8;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSendMessage();
    }
  };

  if (disabled) {
    return (
      <div className="py-2 text-center text-sm italic opacity-50">
        This chat is resolved and locked.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {isNearLimit && (
        <div
          className={`text-right text-xs ${isTooLong ? 'font-semibold text-[var(--theme-error-500)]' : 'text-[var(--theme-warning-500)]'}`}
        >
          {messageLength}/{MAX_MESSAGE_LENGTH}
          {isTooLong && ` - ${messageTooLongText[locale] || messageTooLongText['en']}`}
        </div>
      )}
      <div className="flex items-end gap-2">
        <input
          type="file"
          ref={fileInputReference}
          className="hidden"
          accept="image/*"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              uploadImage(file).catch((error: unknown) => console.error(error));
            }
          }}
        />
        <Button
          onClick={() => fileInputReference.current?.click()}
          size="icon"
          variant="outline"
          className="h-10 w-10 shrink-0 rounded-full text-gray-500 hover:bg-[var(--theme-elevation-100)]"
          disabled={sending || isUploading}
        >
          <Paperclip className="h-5 w-5" />
        </Button>

        <textarea
          ref={(reference) => {
            // Combine refs
            textareaRef.current = reference;
          }}
          value={newMessage}
          onChange={(event) => {
            setNewMessage(event.target.value);
            // Trigger auto resize logic if needed, usually handled by hook on value change or manual call
          }}
          onKeyDown={handleKeyDown}
          placeholder={messagePlaceholder[locale] || messagePlaceholder['en']}
          className="flex-1 resize-none rounded border border-[var(--theme-elevation-300)] bg-[var(--theme-elevation-100)] p-2 text-sm focus:ring-1 focus:ring-[var(--theme-success-500)] focus:outline-none"
          rows={1}
          disabled={sending || isUploading}
          style={{ minHeight: '40px', maxHeight: '200px' }}
        />

        {isTooLong ? (
          <Button
            onClick={() => {
              void handleSplitAndSend();
            }}
            disabled={sending || isUploading}
            className="rounded bg-[var(--theme-warning-500)] px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[var(--theme-warning-600)]"
          >
            {splitAndSendText[locale] || splitAndSendText['en']}
          </Button>
        ) : (
          <Button
            onClick={() => {
              void handleSendMessage();
            }}
            disabled={sending || !newMessage.trim() || isUploading}
            className="rounded bg-[var(--theme-success-500)] px-6 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[var(--theme-success-600)] disabled:opacity-50"
          >
            {sending || isUploading ? '...' : <Send className="h-5 w-5" />}
          </Button>
        )}
      </div>
    </div>
  );
};
