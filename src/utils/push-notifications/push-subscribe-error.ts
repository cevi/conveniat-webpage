/**
 * Why enabling push failed, so the page can tell the user what to do about it.
 *
 * - `blocked`: the permission is denied; only the browser settings bring it back.
 * - `dismissed`: the prompt was closed without an answer; asking again shows it again.
 * - `not-ready`: no service worker to subscribe with, or no VAPID key in this build.
 * - `push-service`: the browser's push service refused, which private windows often do.
 * - `server`: our server did not store the subscription, or could not be reached.
 */
export type PushSubscribeFailureReason =
  'blocked' | 'dismissed' | 'not-ready' | 'push-service' | 'server';

/** A failed `subscribeToPushNotifications`, with the reason to branch on. */
export class PushSubscribeError extends Error {
  readonly reason: PushSubscribeFailureReason;

  constructor(reason: PushSubscribeFailureReason, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'PushSubscribeError';
    this.reason = reason;
  }
}
