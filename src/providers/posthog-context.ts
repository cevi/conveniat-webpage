'use client';

import type { PostHog } from 'posthog-js';
import { createContext, useContext } from 'react';

export const PostHogContext = createContext<PostHog | undefined>(undefined);

export const usePostHog = (): PostHog | undefined => {
  return useContext(PostHogContext);
};
