'use client';

import type { ChatMessage } from '@/features/chat/api/types';
import type { Locale, StaticTranslationString } from '@/types/types';
import { getDocumentLocale, notifyForegroundMessage } from '@/utils/foreground-notifications';

const imageMessagePreview: StaticTranslationString = {
  de: '📷 Bild',
  en: '📷 Image',
  fr: '📷 Image',
};

const fallbackChatName: StaticTranslationString = {
  de: 'Neue Nachricht',
  en: 'New message',
  fr: 'Nouveau message',
};

/**
 * Builds a short preview of a realtime message payload, mirroring the preview the
 * server puts into the push notification body.
 */
export const extractRealtimeMessagePreview = (messagePayload: unknown, locale: Locale): string => {
  if (typeof messagePayload === 'string') return messagePayload;
  if (typeof messagePayload !== 'object' || messagePayload === null) return '';

  const payloadRecord = messagePayload as Record<string, unknown>;

  const text = payloadRecord['text'];
  if (typeof text === 'string' && text.trim() !== '') return text.trim();

  if (typeof payloadRecord['url'] === 'string') return imageMessagePreview[locale];

  return '';
};

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
  message,
  currentUserId,
}: {
  chatId: string;
  chatName: string | undefined;
  message: ChatMessage;
  currentUserId: string;
}): void => {
  if (message.senderId === currentUserId) return;
  if (message.type === 'SYSTEM_MSG') return;
  if (message.id.startsWith('optimistic-')) return;

  const locale = getDocumentLocale();
  const preview = extractRealtimeMessagePreview(message.messagePayload, locale);
  if (preview === '') return;

  const senderName = message.senderName?.trim() ?? '';
  const resolvedChatName = chatName?.trim() ?? '';

  // Same shape as the server-rendered push: chat name as title, "Sender: text" as body.
  const title = resolvedChatName === '' ? senderName || fallbackChatName[locale] : resolvedChatName;
  const body = senderName === '' ? preview : `${senderName}: ${preview}`;

  notifyForegroundMessage({
    chatId,
    messageId: message.id,
    title,
    body,
    targetPath: `/app/chat/${chatId}`,
  });
};
