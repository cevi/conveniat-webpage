import { isPushServiceEndpoint, UNKNOWN_PUSH_SERVICE_ERROR } from '@/lib/push/push-endpoint';
import { z } from 'zod';

/** Refused on the way in, so no row ever holds an endpoint a push must not be posted to. */
const PushEndpointSchema = z
  .string()
  .refine(isPushServiceEndpoint, { message: UNKNOWN_PUSH_SERVICE_ERROR });

/**
 * Standard Web Push Subscription schema (used by web-push package)
 */
export const PushSubscriptionSchema = z.object({
  endpoint: PushEndpointSchema,
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
  endpoint: PushEndpointSchema.nullable().optional(),
  keys: z
    .object({
      p256dh: z.string().nullable().optional(),
      auth: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
});

export type SchemaPushSubscription = z.infer<typeof PushSubscriptionSchema>;
export type DatabasePushSubscription = z.infer<typeof DatabasePushSubscriptionSchema>;
