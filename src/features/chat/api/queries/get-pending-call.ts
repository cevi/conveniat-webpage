import { getPendingCall as readPendingCall } from '@/features/chat/api/utils/pending-call';
import type { CallSignal } from '@/lib/chat-call-signal';
import { readFeatureFlag } from '@/lib/read-feature-flags';
import { trpcBaseProcedure } from '@/trpc/init';

/**
 * The call ringing for the user, for a device that was not listening when the invite went
 * out: opened from the call's push, or back from the background.
 */
export const getPendingCall = trpcBaseProcedure.query(
  async ({ ctx }): Promise<CallSignal | null> => {
    if (!(await readFeatureFlag('voiceCallsEnabled'))) return null;
    return readPendingCall(ctx.user.uuid);
  },
);
