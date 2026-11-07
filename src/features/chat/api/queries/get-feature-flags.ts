import { getFeatureFlag } from '@/lib/db/redis';
import {
  FEATURE_FLAG_CREATE_CHATS_ENABLED,
  FEATURE_FLAG_SEND_MESSAGES,
  FEATURE_FLAG_VOICE_CALLS_ENABLED,
} from '@/lib/feature-flags';
import { trpcBaseProcedure } from '@/trpc/init';

export const getFeatureFlags = trpcBaseProcedure.query(async () => {
  // List of known flags
  const flags = [
    FEATURE_FLAG_SEND_MESSAGES,
    FEATURE_FLAG_CREATE_CHATS_ENABLED,
    FEATURE_FLAG_VOICE_CALLS_ENABLED,
  ];
  const result = await Promise.all(
    flags.map(async (key) => ({
      key,
      isEnabled: await getFeatureFlag(key),
    })),
  );
  return result;
});
