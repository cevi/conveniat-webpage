'use client';

import type { ChatMessage } from '@/features/chat/api/types';
import { imageSentText } from '@/lib/chat-images';
import type { StaticTranslationString } from '@/types/types';
import { getDocumentLocale, notifyForegroundMessage } from '@/utils/foreground-notifications';
import type { ChatType } from '@prisma/client';
import { ImageIcon } from 'lucide-react';

const fallbackChatName: StaticTranslationString = {
  de: 'Neue Nachricht',
  en: 'New message',
  fr: 'Nouveau message',
};

/**
 * The text of a realtime message payload, as the server puts it into the push body.
 * Empty for an image, which has no text; see {@link isImagePayload}.
 */
export const extractRealtimeMessagePreview = (messagePayload: unknown): string => {
  if (typeof messagePayload === 'string') return messagePayload;
  if (typeof messagePayload !== 'object' || messagePayload === null) return '';

  const text = (messagePayload as Record<string, unknown>)['text'];
  if (typeof text === 'string' && text.trim() !== '') return text.trim();

  return '';
};

const isImagePayload = (messagePayload: unknown): boolean =>
  typeof messagePayload === 'object' &&
  messagePayload !== null &&
  typeof (messagePayload as Record<string, unknown>)['url'] === 'string';

/**
 * Surfaces a message that arrived over the realtime (SSE) stream.
 *
 * The SSE stream is the only delivery channel that reaches the app when Firebase
 * throttles or drops a foreground message, and it is what covers the
 * "user is in the chat overview while a message lands in another chat" case.
 * De-duplication against the FCM foreground event happens in
 * {@link notifyForegroundMessage} via the shared message id.
 */
export const notifyRealtimeChatMessage = ({
  chatId,
  chatName,
  chatType,
  message,
  currentUserId,
}: {
  chatId: string;
  chatName: string | undefined;
  /**
   * Type of the chat the message landed in, used to pick the notification channel.
   * The push path derives the same thing server-side; whichever channel wins the
   * race has to reach the same verdict, or an emergency reply sirens only when the
   * SSE stream happens to lose.
   */
  chatType?: ChatType | undefined;
  message: ChatMessage;
  currentUserId: string;
}): void => {
  if (message.senderId === currentUserId) return;
  if (message.type === 'SYSTEM_MSG') return;
  if (message.id.startsWith('optimistic-')) return;

  const locale = getDocumentLocale();
  const isImage = isImagePayload(message.messagePayload);
  const preview = extractRealtimeMessagePreview(message.messagePayload);
  if (preview === '' && !isImage) return;

  const senderName = message.senderName?.trim() ?? '';
  const resolvedChatName = chatName?.trim() ?? '';

  // Same shape as the server-rendered push: chat name as title, "Sender: text" as body, and
  // for an image the sentence the push uses, "Anna hat ein Bild gesendet".
  const title = resolvedChatName === '' ? senderName || fallbackChatName[locale] : resolvedChatName;
  let body = senderName === '' ? preview : `${senderName}: ${preview}`;
  if (isImage) body = imageSentText(senderName)[locale];

  notifyForegroundMessage({
    chatId,
    messageId: message.id,
    title,
    body,
    targetPath: `/app/chat/${chatId}`,
    ...(isImage ? { icon: ImageIcon } : {}),
    notificationType: chatType === 'EMERGENCY' ? 'emergency' : 'default',
  });
};
