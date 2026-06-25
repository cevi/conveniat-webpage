import type { PushNotificationSubscription } from '@/features/payload-cms/payload-types';
import type { RouterInputs } from '@/trpc/client';
import type webpush from 'web-push';

/**
 * Maps standard Web Push subscriptions or DB-stored PushNotificationSubscriptions
 * to the input format expected by the sendTestNotification tRPC procedure.
 *
 * This decouples the core adapter/mapping logic from the React UI components.
 */
export function mapSubscriptionToTestNotificationInput(
  subscription: webpush.PushSubscription | PushNotificationSubscription,
): RouterInputs['pushTracking']['sendTestNotification']['subscription'] {
  if ('platform' in subscription) {
    return {
      platform: subscription.platform,
      token: subscription.token ?? undefined,
      endpoint: subscription.endpoint ?? undefined,
      keys: subscription.keys
        ? {
            p256dh: subscription.keys.p256dh ?? undefined,
            auth: subscription.keys.auth ?? undefined,
          }
        : undefined,
    };
  }

  return {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
  };
}
