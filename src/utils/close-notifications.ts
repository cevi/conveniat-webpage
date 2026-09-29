/**
 * Closes the notifications shown under `tag`, such as a chat's once the chat has been read.
 * Does nothing where there is no service worker, like inside the native app's WebView.
 */
export const closeNotificationsByTag = async (tag: string): Promise<void> => {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    const notifications = (await registration?.getNotifications({ tag })) ?? [];
    for (const notification of notifications) notification.close();
  } catch (error) {
    console.warn('[Notifications] Failed to close notifications:', error);
  }
};
