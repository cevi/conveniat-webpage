'use server';

/**
 * Thin server action wrapper for push notification functions.
 *
 * Client components must import from this file instead of push-notification-api.ts
 * because that file has top-level server-only imports (payload, web-push, etc.)
 * which Turbopack cannot resolve in the client bundle, even with 'use server'.
 *
 * This file keeps zero top-level server imports — everything is lazy-loaded
 * inside the function body so the client bundler only sees the action stubs.
 */

interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export async function sendNotificationToSubscriptionAction(
  subscription: PushSubscriptionData,
  message: string,
  url?: string,
  userId?: string,
): Promise<{ success: boolean; error?: string }> {
  const { sendNotificationToSubscription } = await import('@/utils/push-notification-api');
  return sendNotificationToSubscription(subscription, message, url, userId);
}
