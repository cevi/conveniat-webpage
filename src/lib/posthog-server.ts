import { environmentVariables } from '@/config/environment-variables';
import { PostHog } from 'posthog-node';

let posthogInstance: PostHog | undefined;

export const getPostHogServer = (): PostHog | undefined => {
  if (environmentVariables.NEXT_PUBLIC_POSTHOG_KEY === undefined) {
    console.warn('PostHog key is not set. PostHog will not be initialized.');
    return undefined;
  }

  posthogInstance ??= new PostHog(environmentVariables.NEXT_PUBLIC_POSTHOG_KEY, {
    host: environmentVariables.NEXT_PUBLIC_POSTHOG_HOST,
    flushAt: 1,
    flushInterval: 0,
  });
  return posthogInstance;
};
