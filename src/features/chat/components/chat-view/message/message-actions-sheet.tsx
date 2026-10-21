'use client';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import type { ChatMessage } from '@/features/chat/api/types';
import {
  emojiNames,
  QUICK_EMOJIS,
} from '@/features/chat/components/chat-view/message/message-reaction-menus';
import { DoubleCheck } from '@/features/chat/components/ui/double-check';
import { SheetActionRow } from '@/features/chat/components/ui/sheet-action-row';
import { getDateFnsLocale } from '@/features/chat/hooks/use-format-date';
import { MessageEventType } from '@/lib/prisma/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { format } from 'date-fns';
import { AlertCircle, Check, Clock, Copy, MessageSquare, Reply } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';

const messageText: StaticTranslationString = {
  de: 'Nachricht',
  en: 'Message',
  fr: 'Message',
};

const reactionsText: StaticTranslationString = {
  de: 'Reaktionen',
  en: 'Reactions',
  fr: 'Réactions',
};

const replyText: StaticTranslationString = {
  de: 'Antworten',
  en: 'Reply',
  fr: 'Répondre',
};

const replyInThreadText: StaticTranslationString = {
  de: 'Im Thread antworten',
  en: 'Reply in thread',
  fr: 'Répondre dans le fil',
};

const copyText: StaticTranslationString = {
  de: 'Kopieren',
  en: 'Copy',
  fr: 'Copier',
};

const copiedText: StaticTranslationString = {
  de: 'Kopiert',
  en: 'Copied',
  fr: 'Copié',
};

const copyFailedText: StaticTranslationString = {
  de: 'Nicht kopiert',
  en: 'Could not copy',
  fr: 'Non copié',
};

const statusLabels: Record<MessageEventType, StaticTranslationString> = {
  [MessageEventType.CREATED]: { de: 'Wird gesendet', en: 'Sending', fr: 'Envoi en cours' },
  [MessageEventType.STORED]: { de: 'Gesendet', en: 'Sent', fr: 'Envoyé' },
  [MessageEventType.DISTRIBUTED]: { de: 'Gesendet', en: 'Sent', fr: 'Envoyé' },
  [MessageEventType.RECEIVED]: { de: 'Zugestellt', en: 'Delivered', fr: 'Distribué' },
  [MessageEventType.READ]: { de: 'Gelesen', en: 'Read', fr: 'Lu' },
};

const pendingOfflineText: StaticTranslationString = {
  de: 'Wird gesendet, sobald du online bist',
  en: 'Will be sent once you are online',
  fr: 'Sera envoyé dès que tu seras en ligne',
};

const failedText: StaticTranslationString = {
  de: 'Nicht gesendet',
  en: 'Not sent',
  fr: 'Non envoyé',
};

/** Long enough to read "Kopiert" on the row before the sheet goes. */
const COPIED_FEEDBACK_MS = 700;

const sentAtPattern: Record<Locale, string> = {
  de: 'EEEEEE, d. MMM, HH:mm',
  en: 'EEE, MMM d, HH:mm',
  fr: 'EEE d MMM, HH:mm',
};

/** "Mi, 7. Okt., 20:29"; the same clock as the time in the bubble. */
const formatSentAt = (timestamp: Date | string, locale: Locale): string => {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  return format(date, sentAtPattern[locale], { locale: getDateFnsLocale(locale) });
};

/**
 * When the message went out, and for an own message how far it got: "✓ Gesendet · Mi, 7. Okt.,
 * 20:29". A cached message can carry a status this build does not know yet; it then shows the
 * raw value rather than crash.
 */
export const MessageStatusLine: React.FC<{
  message: ChatMessage;
  isCurrentUser: boolean;
  locale: Locale;
}> = ({ message, isCurrentUser, locale }) => {
  const sentAt = formatSentAt(message.createdAt, locale);
  if (!isCurrentUser) return <p className="text-[13px] text-green-700">{sentAt}</p>;

  let icon: React.ReactNode;
  let label: string;
  if (message.sendFailed === true) {
    icon = <AlertCircle className="text-danger h-3.5 w-3.5" aria-hidden="true" />;
    label = failedText[locale];
  } else if (message.isPendingOffline === true) {
    icon = <Clock className="h-3.5 w-3.5" aria-hidden="true" />;
    label = pendingOfflineText[locale];
  } else {
    const labels: Partial<Record<string, StaticTranslationString>> = statusLabels;
    label = labels[message.status]?.[locale] ?? message.status;
    switch (message.status) {
      case MessageEventType.CREATED: {
        icon = <Clock className="h-3.5 w-3.5" aria-hidden="true" />;
        break;
      }
      case MessageEventType.RECEIVED: {
        icon = <DoubleCheck />;
        break;
      }
      case MessageEventType.READ: {
        icon = <DoubleCheck className="text-conveniat-green" />;
        break;
      }
      default: {
        icon = <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />;
      }
    }
  }

  return (
    <p className="flex items-center gap-1 text-[13px] text-green-700">
      {icon}
      <span>{label}</span>
      <span aria-hidden="true">·</span>
      <span>{sentAt}</span>
    </p>
  );
};

interface MessageActionsSheetProperties {
  message: ChatMessage;
  isCurrentUser: boolean;
  locale: Locale;
  /** The bubble as it shows in the chat, inert here. */
  preview: React.ReactNode;
  onClose: () => void;
  /** Absent where the user may not react, e.g. in a chat without reactions. */
  reactions?: { reactedEmojis: ReadonlySet<string>; onReact: (emoji: string) => void } | undefined;
  onReply?: (() => void) | undefined;
  onReplyInThread?: (() => void) | undefined;
  /** The text "Kopieren" puts on the clipboard; absent for a message without any. */
  textToCopy?: string | undefined;
}

/**
 * Everything one can do with a message, opened by a long press, a right click or the
 * context-menu key on its bubble: the message itself with when it went out, the reactions, and
 * the actions as rows. A choice closes the sheet.
 */
export const MessageActionsSheet: React.FC<MessageActionsSheetProperties> = ({
  message,
  isCurrentUser,
  locale,
  preview,
  onClose,
  reactions,
  onReply,
  onReplyInThread,
  textToCopy,
}) => {
  const [copyState, setCopyState] = useState<'copied' | 'failed'>();

  const then = (action: () => void) => (): void => {
    action();
    onClose();
  };

  const copy = async (): Promise<void> => {
    if (textToCopy === undefined) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopyState('copied');
      setTimeout(onClose, COPIED_FEEDBACK_MS);
    } catch {
      // the clipboard is missing outside a secure context and may refuse the write
      setCopyState('failed');
    }
  };

  let copyLabel = copyText[locale];
  if (copyState === 'copied') copyLabel = copiedText[locale];
  if (copyState === 'failed') copyLabel = copyFailedText[locale];

  const hasActions =
    onReply !== undefined || onReplyInThread !== undefined || textToCopy !== undefined;

  return (
    <BottomSheet
      open
      onOpenChange={(open) => !open && onClose()}
      title={messageText[locale]}
      hideTitle
      showClose={false}
    >
      <div
        className={cn('flex flex-col gap-1.5 pt-1', isCurrentUser ? 'items-end' : 'items-start')}
      >
        {preview}
        <MessageStatusLine message={message} isCurrentUser={isCurrentUser} locale={locale} />
      </div>

      {reactions !== undefined && (
        <div
          role="group"
          aria-label={reactionsText[locale]}
          className="mt-4 flex items-center justify-between"
        >
          {QUICK_EMOJIS.map((emoji) => {
            const hasReacted = reactions.reactedEmojis.has(emoji);
            return (
              <button
                key={emoji}
                type="button"
                onClick={then(() => reactions.onReact(emoji))}
                aria-label={emojiNames[emoji]?.[locale] ?? emoji}
                aria-pressed={hasReacted}
                className={cn(
                  'flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border text-[1.5rem] transition-transform duration-150 active:scale-90',
                  hasReacted
                    ? 'border-tint-line bg-tint hover:bg-tint-line'
                    : 'bg-quiet hover:bg-chip border-transparent',
                )}
              >
                {emoji}
              </button>
            );
          })}
        </div>
      )}

      {hasActions && (
        <ul className="border-line -mx-5 mt-4 border-t px-2 pt-2">
          {onReply !== undefined && (
            <SheetActionRow icon={Reply} label={replyText[locale]} onClick={then(onReply)} />
          )}
          {onReplyInThread !== undefined && (
            <SheetActionRow
              icon={MessageSquare}
              label={replyInThreadText[locale]}
              onClick={then(onReplyInThread)}
            />
          )}
          {textToCopy !== undefined && (
            <SheetActionRow
              icon={copyState === 'copied' ? Check : Copy}
              label={copyLabel}
              onClick={() => void copy()}
              liveLabel
            />
          )}
        </ul>
      )}
    </BottomSheet>
  );
};
