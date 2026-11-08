import { chatNotificationTag, emergencyNotificationTagPrefix } from '@/utils/notification-tags';

/**
 * Closes the notifications of a chat once it has been read: its chat notification and every
 * emergency notification of it. In the browser they are the service worker's; in the native
 * app the shell closes its own, the ones the OS rendered from a background push included,
 * since the server tags those the same way. An app build without the command keeps them.
 */
export const closeChatNotifications = async (chatId: string): Promise<void> => {
  const chatTag = chatNotificationTag(chatId);
  const emergencyPrefix = emergencyNotificationTagPrefix(chatId);

  try {
    globalThis.AppWebViewNativePush?.closeNotifications?.({
      tags: [chatTag],
      tagPrefixes: [emergencyPrefix],
    });
  } catch (error) {
    console.warn('[Notifications] Failed to close native notifications:', error);
  }

  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    const notifications = (await registration?.getNotifications()) ?? [];
    for (const notification of notifications) {
      if (notification.tag === chatTag || notification.tag.startsWith(emergencyPrefix)) {
        notification.close();
      }
    }
  } catch (error) {
    console.warn('[Notifications] Failed to close notifications:', error);
  }
};

/**
 * Closes every notification of this site or app, so the person logging in next does not see
 * the messages of the one who left.
 */
export const closeAllNotifications = async (): Promise<void> => {
  try {
    globalThis.AppWebViewNativePush?.closeAllNotifications?.();
  } catch (error) {
    console.warn('[Notifications] Failed to close native notifications:', error);
  }

  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    for (const notification of (await registration?.getNotifications()) ?? []) {
      notification.close();
    }
  } catch (error) {
    console.warn('[Notifications] Failed to close notifications:', error);
  }
};
