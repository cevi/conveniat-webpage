import { chatNotificationTag, emergencyNotificationTagPrefix } from '@/utils/notification-tags';

/**
 * Closes the notifications of a chat once it has been read: its stacked chat notification and
 * every emergency notification of it. Does nothing where there is no service worker, like
 * inside the native app's WebView.
 */
export const closeChatNotifications = async (chatId: string): Promise<void> => {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

  const chatTag = chatNotificationTag(chatId);
  const emergencyPrefix = emergencyNotificationTagPrefix(chatId);
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
