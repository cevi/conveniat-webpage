import { featureFlags, type FeatureFlagName } from '@/lib/feature-flags';
import { readFeatureFlags } from '@/lib/read-feature-flags';
import { trpcBaseProcedure } from '@/trpc/init';

/** The flags the chat client reads, each by its `key`. */
const CLIENT_FLAGS = [
  'globalMessagingEnabled',
  'createChatsEnabled',
  'voiceCallsEnabled',
] as const satisfies readonly FeatureFlagName[];

export const getFeatureFlags = trpcBaseProcedure.query(async () => {
  const values = await readFeatureFlags(CLIENT_FLAGS);
  return CLIENT_FLAGS.map((name) => ({ key: featureFlags[name].key, isEnabled: values[name] }));
});
