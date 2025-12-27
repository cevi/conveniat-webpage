import { DialogDescription } from '@/components/ui/dialog';
import type { ChatMessage } from '@/features/chat/api/types';
import { formatMessageContent } from '@/features/chat/components/chat-view/message/utils/format-message-content';
import {
  ChatDialog,
  ChatDialogContent,
  ChatDialogHeader,
  ChatDialogTitle,
} from '@/features/chat/components/ui/chat-dialog';
import { useFormatDate } from '@/features/chat/hooks/use-format-date';
import { MessageEventType } from '@/lib/prisma/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Check, Clock } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import React from 'react';

const messageInfoText: StaticTranslationString = {
  de: 'Nachrichten-Details',
  en: 'Message Info',
  fr: 'Infos message',
};

const statusText: StaticTranslationString = {
  de: 'Status',
  en: 'Status',
  fr: 'Statut',
};

const sentText: StaticTranslationString = {
  de: 'Gesendet',
  en: 'Sent',
  fr: 'Envoyé',
};

/**
 * A full-screen overlay that displays message event timestamps and details.
 */
export const MessageInfoDropdown: React.FC<{
  message: ChatMessage;
  isCurrentUser: boolean;
  onClose: () => void;
}> = ({ message, isCurrentUser, onClose }) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const { formatMessageTime } = useFormatDate();
  const renderedContent = formatMessageContent(message.messagePayload, locale);

  const sentDate = new Date(message.createdAt);

  return (
    <ChatDialog open onOpenChange={(open) => !open && onClose()}>
      <ChatDialogContent className="sm:max-w-md">
        <ChatDialogHeader>
          <ChatDialogTitle>{messageInfoText[locale]}</ChatDialogTitle>
          <DialogDescription className="sr-only">Message details and status</DialogDescription>
        </ChatDialogHeader>

        <div className="space-y-6 py-4">
          {/* Message Preview */}
          <div
            className={cn(
              'rounded-lg p-4 shadow-sm',
              isCurrentUser ? 'bg-conveniat-green text-white' : 'bg-gray-100 text-gray-900',
            )}
          >
            <div className="font-body text-sm">{renderedContent}</div>
            <div
              className={cn(
                'mt-2 flex items-center justify-end text-xs',
                isCurrentUser ? 'text-white/80' : 'text-gray-500',
              )}
            >
              {formatMessageTime(sentDate)}
            </div>
          </div>

          {/* Details List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <div className="flex items-center gap-2">
                <div className="bg-conveniat-green/10 flex h-8 w-8 items-center justify-center rounded-full">
                  <Clock className="text-conveniat-green h-4 w-4" />
                </div>
                <span className="font-body font-medium text-gray-700">{sentText[locale]}</span>
              </div>
              <span className="font-body text-sm text-gray-500">{formatMessageTime(sentDate)}</span>
            </div>

            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <div className="flex items-center gap-2">
                <div className="bg-conveniat-green/10 flex h-8 w-8 items-center justify-center rounded-full">
                  <Check className="text-conveniat-green h-4 w-4" />
                </div>
                <span className="font-body font-medium text-gray-700">{statusText[locale]}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {/* Visual Indicator for Status */}
                {message.status === MessageEventType.READ && (
                  <div className="flex">
                    <Check className="text-conveniat-green h-4 w-4" />
                    <Check className="text-conveniat-green -ml-2 h-4 w-4" />
                  </div>
                )}
                {message.status === MessageEventType.RECEIVED && (
                  <div className="flex">
                    <Check className="h-4 w-4 text-gray-400" />
                    <Check className="-ml-2 h-4 w-4 text-gray-400" />
                  </div>
                )}
                {message.status === MessageEventType.STORED && (
                  <Check className="h-4 w-4 text-gray-400" />
                )}
                <span className="font-body text-sm text-gray-500 capitalize">
                  {message.status.toLowerCase()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </ChatDialogContent>
    </ChatDialog>
  );
};
