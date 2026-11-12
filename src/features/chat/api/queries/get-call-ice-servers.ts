import { environmentVariables } from '@/config/environment-variables';
import { chatError } from '@/features/chat/api/chat-errors';
import type { CallIceServers } from '@/lib/chat-call-signal';
import { readFeatureFlag } from '@/lib/read-feature-flags';
import { trpcBaseProcedure } from '@/trpc/init';
import { createHmac } from 'node:crypto';

/** Long enough for any call, short enough that a leaked credential is soon worthless. */
const CREDENTIAL_LIFETIME_SECONDS = 6 * 60 * 60;

/**
 * The relays a device may use for a call. coturn's `use-auth-secret` scheme: the username is
 * the expiry and the user, the password its HMAC under the shared secret, so the relay checks
 * them without asking us and nothing has to be stored.
 */
export const getCallIceServers = trpcBaseProcedure.query(
  async ({ ctx }): Promise<CallIceServers> => {
    if (!(await readFeatureFlag('voiceCallsEnabled'))) {
      throw chatError('PRECONDITION_FAILED', 'callsDisabled');
    }

    const urls = (environmentVariables.CALL_TURN_URLS ?? '')
      .split(',')
      .map((url) => url.trim())
      .filter(Boolean);
    const secret = environmentVariables.CALL_TURN_SECRET;
    if (urls.length === 0 || secret === undefined) return { iceServers: [] };

    const expiry = Math.floor(Date.now() / 1000) + CREDENTIAL_LIFETIME_SECONDS;
    const username = `${expiry}:${ctx.user.uuid}`;
    const credential = createHmac('sha1', secret).update(username).digest('base64');
    return { iceServers: [{ urls, username, credential }] };
  },
);
