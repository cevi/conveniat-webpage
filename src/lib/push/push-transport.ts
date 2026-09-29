import { environmentVariables } from '@/config/environment-variables';
import type { PushNotificationSubscription } from '@/features/payload-cms/payload-types';
import type { NotificationType } from '@/lib/notification-type';
import { PushNotificationChannel } from '@/lib/prisma';
import type { DatabasePushSubscription, SchemaPushSubscription } from '@/schemas/push';
import {
  fitPushText,
  PUSH_BODY_MAX_BYTES,
  PUSH_TITLE_MAX_BYTES,
} from '@/utils/push-notifications/fit-push-text';
import { stripMarkdownFormatting } from '@/utils/strip-markdown-formatting';
import type webpush from 'web-push';

// Lazy-init web-push to avoid top-level side effects that break
// client-side module evaluation (web-push is Node.js-only). The environment is read here too,
// not at module scope: the Payload CLI loads this module without one.
let webpushInstance: typeof webpush | undefined;
async function getWebPush(): Promise<typeof webpush> {
  if (!webpushInstance) {
    const module_ = await import('web-push');
    webpushInstance = module_.default;
    const appHostUrl = environmentVariables.NEXT_PUBLIC_APP_HOST_URL;
    // vapid subject must be mailto or https, thus we fall back to https://conveniat27.ch
    // if the NEXT_PUBLIC_APP_HOST_URL is not set or localhost
    const subject = appHostUrl.includes('https://') ? appHostUrl : 'https://conveniat27.ch';
    const validatedPublicKey = environmentVariables.NEXT_PUBLIC_VAPID_PUBLIC_KEY.trim();
    const validatedPrivateKey = environmentVariables.VAPID_PRIVATE_KEY.trim();
    if (validatedPublicKey === '' || validatedPrivateKey === '') {
      throw new Error(
        'Missing or invalid VAPID configuration: NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY must be non-empty strings.',
      );
    }
    webpushInstance.setVapidDetails(subject, validatedPublicKey, validatedPrivateKey);
  }
  return webpushInstance;
}

/**
 * web-push waits for an answer forever by default, and one push service that stops answering
 * then holds a slot of the fan-out until the process restarts.
 */
const WEB_PUSH_TIMEOUT_MS = 10_000;

/** Push services answer an unsubscribed or expired Web Push subscription with one of these. */
const EXPIRED_WEB_PUSH_STATUS_CODES = new Set([404, 410]);

/** Answers that say "not now" rather than "never": too many requests, or the service is down. */
const RETRYABLE_WEB_PUSH_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

/**
 * FCM errors that can succeed on a later attempt, see
 * https://firebase.google.com/docs/cloud-messaging/send/admin-sdk#error-codes. The rest either
 * name a dead token or a message FCM will never take.
 */
const RETRYABLE_FCM_ERROR_CODES = new Set([
  'messaging/server-unavailable',
  'messaging/internal-error',
  'messaging/quota-exceeded',
  'messaging/device-message-rate-exceeded',
  'messaging/message-rate-exceeded',
  'messaging/unknown-error',
  'app/network-error',
  'app/network-timeout',
]);

/** Keeps a verbose push service body from filling the log row and the Loki line. */
const MAX_RESPONSE_BODY_LENGTH = 300;

/** Anything a push can be sent to: a stored subscription, or one the browser just handed over. */
export type PushDevice =
  | webpush.PushSubscription
  | PushNotificationSubscription
  | SchemaPushSubscription
  | DatabasePushSubscription;

/** What a device shows. `title` and `body` must have gone through {@link composePushText}. */
export interface PushMessage {
  title: string;
  body: string;
  url?: string | undefined;
  /** Id of the underlying chat message, used by clients to de-duplicate push vs. SSE. */
  messageId?: string | undefined;
  /**
   * How urgently the notification should be presented. `emergency` routes native
   * pushes to the siren channel; see {@link NotificationType}.
   */
  notificationType?: NotificationType | undefined;
  ignoreIfAppOpen?: boolean | undefined;
  ignoreIfUrlMatches?: boolean | undefined;
  /**
   * How the web notification sits next to the ones already shown; only the service worker reads
   * these, see `presentNotification` there. `tag` replaces what is shown under the same tag,
   * `stack` lists the newest pushes under it and alerts again.
   */
  tag?: string | undefined;
  stack?: boolean | undefined;
}

/** How this one delivery travels. */
export interface PushDeliveryOptions {
  /**
   * The push log row, which the device reports back to. It also serves as the collapse key,
   * so a retry of a push the device already got replaces it instead of showing it twice.
   */
  logId?: string | undefined;
  /** How long the push service keeps the push for a device that is offline. */
  timeToLiveSeconds: number;
  /** Asks the push service to wake the device right away, even in power saving mode. */
  urgent: boolean;
}

/**
 * How a send ended.
 *
 * - `accepted`: the push service took it. Only the device can later say it arrived.
 * - `expired`: the device unsubscribed. Its subscription should go.
 * - `retry`: the push service could not take it now. A later attempt can succeed.
 * - `failed`: it will fail the same way every time.
 */
export type PushTransportOutcome = 'accepted' | 'expired' | 'retry' | 'failed';

export interface PushTransportResult {
  outcome: PushTransportOutcome;
  /** What went wrong, in words an admin reading the notification history can act on. */
  error?: string;
  /** The pause a push service asked for with `Retry-After`. */
  retryAfterSeconds?: number;
  statusCode?: number;
  fcmErrorCode?: string;
  responseBody?: string;
  /** The error itself, for the log line. */
  cause?: unknown;
}

export const channelOf = (
  device: PushDevice | Pick<PushNotificationSubscription, 'platform'>,
): PushNotificationChannel =>
  'platform' in device && (device.platform === 'ios' || device.platform === 'android')
    ? PushNotificationChannel.NATIVE_FCM
    : PushNotificationChannel.WEB_PUSH;

/**
 * The title and body as the device gets them.
 *
 * The operating system renders the notification verbatim, so the chat's markdown markers
 * would show up as literal `*` and `_` on the lock screen. A push over the service's limit is
 * rejected for every recipient, so long texts are cut to a preview.
 */
export const composePushText = (text: { title: string; body: string }): PushMessage => ({
  title: fitPushText(stripMarkdownFormatting(text.title), PUSH_TITLE_MAX_BYTES),
  body: fitPushText(stripMarkdownFormatting(text.body), PUSH_BODY_MAX_BYTES),
});

/** `Retry-After` is either a number of seconds or an HTTP date. */
export const parseRetryAfter = (value: unknown, now: Date = new Date()): number | undefined => {
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds);
  const date = Date.parse(value);
  if (Number.isNaN(date)) return undefined;
  return Math.max(0, (date - now.getTime()) / 1000);
};

/**
 * web-push rejects every non-2xx answer with a `WebPushError` whose message is always
 * "Received unexpected response code". The push service's verdict lives only in
 * `statusCode`, `headers` and `body`, so they have to be read off the error explicitly.
 */
const webPushRejectionOf = (
  error: unknown,
): { statusCode: number; body: string; retryAfterSeconds: number | undefined } | undefined => {
  if (typeof error !== 'object' || error === null) return undefined;
  if (!('statusCode' in error) || typeof error.statusCode !== 'number') return undefined;
  const body = 'body' in error && typeof error.body === 'string' ? error.body.trim() : '';
  const headers =
    'headers' in error && typeof error.headers === 'object' && error.headers !== null
      ? (error.headers as Record<string, unknown>)
      : {};
  return {
    statusCode: error.statusCode,
    body: body.slice(0, MAX_RESPONSE_BODY_LENGTH),
    retryAfterSeconds: parseRetryAfter(headers['retry-after']),
  };
};

/**
 * FCM reports a dead token as the bare message `NotRegistered`, and a dead APNs token as
 * `APNs device token is disabled.`. Prefer the machine-readable code and keep the message
 * checks as a case-insensitive fallback.
 */
const indicatesDeadToken = (message: string): boolean => {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('notregistered') ||
    normalized.includes('not-registered') ||
    normalized.includes('invalid-registration-token') ||
    normalized.includes('registration-token-not-registered') ||
    normalized.includes('device token is disabled') ||
    normalized.includes('not a valid fcm registration token') ||
    normalized.includes('not found') ||
    normalized.includes('gone')
  );
};

const isDeadFcmToken = (errorCode: string | undefined, message: string): boolean =>
  errorCode === 'messaging/registration-token-not-registered' ||
  errorCode === 'messaging/invalid-registration-token' ||
  // `invalid-argument` is also raised for a malformed payload, which is our bug and not the
  // subscriber's - it only counts when the message names the token, so a bad payload can
  // never delete healthy subscriptions.
  indicatesDeadToken(message);

const errorMessageOf = (error: unknown): string =>
  error instanceof Error ? error.message : 'Unknown error';

/**
 * Only this deployment's own host is cut down to a path. A link to another host, like the
 * short domain con27.ch, stays whole: the page follows it with a full navigation, and
 * con27.ch redirects back here through `/go`. Its path alone, `/agbs`, is a 404.
 */
const nativeUrlOf = (url: string | undefined): string | undefined => {
  const appHostUrl = environmentVariables.NEXT_PUBLIC_APP_HOST_URL;
  return appHostUrl !== '' && url?.startsWith(appHostUrl) === true
    ? url.replace(appHostUrl, '')
    : url;
};

const chatIdOfUrl = (url: string | undefined): string | undefined => {
  if (url?.includes('/app/chat/') !== true) return undefined;
  const afterChat = url.split('/app/chat/')[1];
  if (afterChat === undefined || afterChat === '') return undefined;
  return afterChat.split('?')[0];
};

const booleanFlag = (value: boolean | undefined): 'true' | 'false' | undefined => {
  if (value === undefined) return undefined;
  return value ? 'true' : 'false';
};

async function sendNative(
  token: string,
  message: PushMessage,
  options: PushDeliveryOptions,
): Promise<PushTransportResult> {
  const url = nativeUrlOf(message.url === '' ? undefined : message.url);
  const chatId = chatIdOfUrl(url);
  const ignoreIfAppOpen = booleanFlag(message.ignoreIfAppOpen);
  const ignoreIfUrlMatches = booleanFlag(message.ignoreIfUrlMatches);

  // Imported on use: `firebase-admin` is `server-only`, and the announcements collection pulls
  // this module into the Payload config, which the Payload CLI loads outside of Next.js.
  const { sendFcmNotification } = await import('@/lib/firebase-admin');
  const result = await sendFcmNotification(token, {
    title: message.title,
    body: message.body,
    timeToLiveSeconds: options.timeToLiveSeconds,
    data: {
      ...(url !== undefined && { url, path: url, link: url }),
      ...(chatId !== undefined && { chatId }),
      ...(message.messageId !== undefined && { messageId: message.messageId }),
      ...(options.logId !== undefined && { notificationId: options.logId }),
      ...(ignoreIfAppOpen !== undefined && { ignoreIfAppOpen }),
      ...(ignoreIfUrlMatches !== undefined && { ignoreIfUrlMatches }),
      ...(message.notificationType !== undefined && {
        notificationType: message.notificationType,
      }),
    },
  });
  if (result.success) return { outcome: 'accepted' };

  const error = result.error ?? 'FCM send failed';
  const details = {
    error,
    ...(result.errorCode !== undefined && { fcmErrorCode: result.errorCode }),
  };
  if (isDeadFcmToken(result.errorCode, error)) return { outcome: 'expired', ...details };
  if (result.errorCode !== undefined && RETRYABLE_FCM_ERROR_CODES.has(result.errorCode)) {
    return { outcome: 'retry', ...details };
  }
  return { outcome: 'failed', ...details };
}

async function sendWeb(
  subscription: webpush.PushSubscription,
  message: PushMessage,
  options: PushDeliveryOptions,
): Promise<PushTransportResult> {
  const wp = await getWebPush();
  const url = message.url === '' ? undefined : message.url;
  const ignoreIfAppOpen = booleanFlag(message.ignoreIfAppOpen);
  const ignoreIfUrlMatches = booleanFlag(message.ignoreIfUrlMatches);
  try {
    await wp.sendNotification(
      subscription,
      JSON.stringify({
        title: message.title,
        body: message.body,
        data: {
          url,
          notificationId: options.logId,
          ...(message.messageId !== undefined && { messageId: message.messageId }),
          ...(ignoreIfAppOpen !== undefined && { ignoreIfAppOpen }),
          ...(ignoreIfUrlMatches !== undefined && { ignoreIfUrlMatches }),
          ...(message.tag !== undefined && { tag: message.tag }),
          ...(message.stack === true && { stack: true }),
        },
      }),
      {
        TTL: options.timeToLiveSeconds,
        urgency: options.urgent ? 'high' : 'normal',
        timeout: WEB_PUSH_TIMEOUT_MS,
        // A UUID without its dashes is 32 URL-safe characters, exactly what a topic may be.
        ...(options.logId !== undefined && { topic: options.logId.replaceAll('-', '') }),
      },
    );
    return { outcome: 'accepted' };
  } catch (error: unknown) {
    const rejection = webPushRejectionOf(error);
    // No answer at all: a timeout, a reset connection or a DNS failure. Worth another try.
    if (rejection === undefined) {
      return { outcome: 'retry', error: errorMessageOf(error), cause: error };
    }

    const answer = `Push service answered ${rejection.statusCode}`;
    const details = {
      error: rejection.body === '' ? answer : `${answer}: ${rejection.body}`,
      statusCode: rejection.statusCode,
      responseBody: rejection.body,
      cause: error,
    };
    if (EXPIRED_WEB_PUSH_STATUS_CODES.has(rejection.statusCode)) {
      return { outcome: 'expired', ...details };
    }
    if (RETRYABLE_WEB_PUSH_STATUS_CODES.has(rejection.statusCode)) {
      return {
        outcome: 'retry',
        ...details,
        ...(rejection.retryAfterSeconds !== undefined && {
          retryAfterSeconds: rejection.retryAfterSeconds,
        }),
      };
    }
    return { outcome: 'failed', ...details };
  }
}

/**
 * Sends one push to one device and says how it went. Never throws, and never logs: the caller
 * knows whether a failure is one of thousands or the only one.
 */
export async function sendPushToDevice(
  device: PushDevice,
  message: PushMessage,
  options: PushDeliveryOptions,
): Promise<PushTransportResult> {
  try {
    if (channelOf(device) === PushNotificationChannel.NATIVE_FCM) {
      const token = 'token' in device ? device.token : undefined;
      if (typeof token !== 'string' || token === '') {
        const platform = 'platform' in device ? String(device.platform) : 'native';
        return {
          outcome: 'failed',
          error: `Native push token is missing for platform: ${platform}`,
        };
      }
      return await sendNative(token, message, options);
    }

    const keys = 'keys' in device ? device.keys : undefined;
    const endpoint = 'endpoint' in device ? device.endpoint : undefined;
    if (
      typeof endpoint !== 'string' ||
      endpoint === '' ||
      typeof keys?.p256dh !== 'string' ||
      typeof keys.auth !== 'string'
    ) {
      return {
        outcome: 'failed',
        error: 'Web Push subscription is missing required fields (endpoint or keys).',
      };
    }
    return await sendWeb(
      { endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } },
      message,
      options,
    );
  } catch (error: unknown) {
    // A missing VAPID key and the like: nothing a retry changes.
    return { outcome: 'failed', error: errorMessageOf(error), cause: error };
  }
}
