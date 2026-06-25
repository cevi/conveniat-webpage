import { z } from 'zod';

/**
 * Standard Web Push Subscription schema (used by web-push package)
 */
export const PushSubscriptionSchema = z.object({
  endpoint: z.string(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});

/**
 * Database-backed Push Subscription schema (used by Payload CMS / Native notifications)
 */
export const DatabasePushSubscriptionSchema = z.object({
  platform: z.enum(['web', 'ios', 'android']),
  token: z.string().nullable().optional(),
  endpoint: z.string().nullable().optional(),
  keys: z
    .object({
      p256dh: z.string().nullable().optional(),
      auth: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
});
