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
import { Check, Clock, User } from 'lucide-react';
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

const senderText: StaticTranslationString = {
  de: 'Von',
  en: 'From',
  fr: 'De',
};

const dialogDescriptionText: StaticTranslationString = {
  de: 'Details und Status der Nachricht',
  en: 'Message details and status',
  fr: 'Détails et statut du message',
};

const statusLabels: Record<MessageEventType, StaticTranslationString> = {
  [MessageEventType.CREATED]: { de: 'Wird gesendet', en: 'Sending', fr: 'Envoi en cours' },
  [MessageEventType.STORED]: { de: 'Gesendet', en: 'Sent', fr: 'Envoyé' },
  [MessageEventType.DISTRIBUTED]: { de: 'Zugestellt', en: 'Delivered', fr: 'Distribué' },
  [MessageEventType.RECEIVED]: { de: 'Empfangen', en: 'Received', fr: 'Reçu' },
  [MessageEventType.READ]: { de: 'Gelesen', en: 'Read', fr: 'Lu' },
};

/**
 * Cached messages can carry a status this build does not know yet, so the lookup is
 * widened to a string key and falls back to the raw value instead of crashing.
 */
const localizedStatus = (status: MessageEventType, locale: Locale): string => {
  const labels: Partial<Record<string, StaticTranslationString>> = statusLabels;
  return labels[status]?.[locale] ?? status;
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
          <DialogDescription className="sr-only">{dialogDescriptionText[locale]}</DialogDescription>
        </ChatDialogHeader>

        <div className="space-y-6 py-4">
          {/* Message Preview */}
          <div
            className={cn(
              'rounded-2xl px-3.5 py-2.5',
              isCurrentUser
                ? 'bg-conveniat-green text-white'
                : 'border-line border bg-white text-green-900',
            )}
          >
            <div className="text-[15px]">{renderedContent}</div>
            <div
              className={cn(
                'mt-2 flex items-center justify-end text-xs',
                isCurrentUser ? 'text-white/80' : 'text-green-500',
              )}
            >
              {formatMessageTime(sentDate)}
            </div>
          </div>

          {/* Details List */}
          <div className="space-y-4">
            <div className="border-line flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2">
                <div className="bg-tint flex h-8 w-8 items-center justify-center rounded-[10px]">
                  <Clock className="text-conveniat-green h-4 w-4" />
                </div>
                <span className="text-[15px] font-semibold text-green-900">{sentText[locale]}</span>
              </div>
              <span className="text-sm text-green-700">{formatMessageTime(sentDate)}</span>
            </div>

            {/* the delivery status belongs to the sender; on a received message it would
                only ever say "sent" */}
            {isCurrentUser ? (
              <div className="border-line flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-2">
                  <div className="bg-tint flex h-8 w-8 items-center justify-center rounded-[10px]">
                    <Check className="text-conveniat-green h-4 w-4" />
                  </div>
                  <span className="text-[15px] font-semibold text-green-900">
                    {statusText[locale]}
                  </span>
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
                      <Check className="h-4 w-4 text-green-500" />
                      <Check className="-ml-2 h-4 w-4 text-green-500" />
                    </div>
                  )}
                  {message.status === MessageEventType.STORED && (
                    <Check className="h-4 w-4 text-green-500" />
                  )}
                  <span className="text-sm text-green-700">
                    {localizedStatus(message.status, locale)}
                  </span>
                </div>
              </div>
            ) : (
              message.senderName !== undefined &&
              message.senderName !== '' && (
                <div className="border-line flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2">
                    <div className="bg-tint flex h-8 w-8 items-center justify-center rounded-[10px]">
                      <User className="text-conveniat-green h-4 w-4" />
                    </div>
                    <span className="text-[15px] font-semibold text-green-900">
                      {senderText[locale]}
                    </span>
                  </div>
                  <span className="text-sm text-green-700">{message.senderName}</span>
                </div>
              )
            )}
          </div>
        </div>
      </ChatDialogContent>
    </ChatDialog>
  );
};
