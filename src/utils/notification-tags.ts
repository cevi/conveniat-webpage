/**
 * Tags under which web notifications are shown. The browser keeps one notification per tag,
 * so the tag decides what a new push replaces. The server sets it on the push, the service
 * worker shows it, and the page closes a chat's notifications by it once the chat is read.
 */

/** All messages of one chat share one notification, which lists the newest of them. */
export const chatNotificationTag = (chatId: string): string => `chat:${chatId}`;

/** Every announcement gets a notification of its own, so a later one never hides it. */
export const announcementNotificationTag = (messageId: string): string =>
  `announcement:${messageId}`;

/** What every emergency notification of a chat starts with, see {@link emergencyNotificationTag}. */
export const emergencyNotificationTagPrefix = (chatId: string): string => `emergency:${chatId}:`;

/**
 * Every message of an emergency chat gets a notification of its own, so each one alerts and
 * nothing later replaces it. The chat id in front lets reading the chat close all of them.
 */
export const emergencyNotificationTag = (chatId: string, messageId: string): string =>
  `${emergencyNotificationTagPrefix(chatId)}${messageId}`;
