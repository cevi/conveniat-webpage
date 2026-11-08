import type { CallSignal } from '@/lib/chat-call-signal';
import { redis } from '@/lib/db/redis';
import { createLogger } from '@/utils/server-logger';

const logger = createLogger('chat:call');

/** A little longer than the caller rings, so a phone opened in the last seconds still rings. */
const PENDING_CALL_TTL_SECONDS = 50;

const keyOf = (userId: string): string => `chat:pending-call:${userId}`;

/**
 * Remembers the call ringing for a user, so a device that opens the app from the push, or
 * comes back from the background, still finds it: the invite on the realtime stream is gone
 * by then. One per user; a newer invite replaces it.
 */
export const setPendingCall = async (calleeId: string, invite: CallSignal): Promise<void> => {
  try {
    await redis.set(keyOf(calleeId), JSON.stringify(invite), 'EX', PENDING_CALL_TTL_SECONDS);
  } catch (error) {
    // the call still rings on every device that is open; only a late one misses it
    logger.warn('Could not store the pending call', { error, 'chat.call.id': invite.callId });
  }
};

/** The call ringing for the user right now, if any. */
export const getPendingCall = async (userId: string): Promise<CallSignal | null> => {
  const value = await redis.get(keyOf(userId));
  if (value === null) return null;
  try {
    return JSON.parse(value) as CallSignal;
  } catch {
    return null;
  }
};

/** Forgets the call once it was taken, declined or ended, unless a newer one replaced it. */
export const clearPendingCall = async (userId: string, callId: string): Promise<void> => {
  try {
    const pending = await getPendingCall(userId);
    if (pending?.callId === callId) await redis.del(keyOf(userId));
  } catch (error) {
    logger.warn('Could not clear the pending call', { error, 'chat.call.id': callId });
  }
};
