'use client';

import type { CallState } from '@/features/chat/calls/call-engine';
import {
  canMakeCalls,
  getCallState,
  getServerCallState,
  subscribeToCall,
} from '@/features/chat/calls/call-engine';
import { featureFlags as flagDefinitions } from '@/lib/feature-flags';
import { useTRPC } from '@/trpc/client';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState, useSyncExternalStore } from 'react';

/** The call this page is in, or `idle`. */
export const useCallState = (): CallState =>
  useSyncExternalStore(subscribeToCall, getCallState, getServerCallState);

const unsubscribeFromNothing = (): void => {};
const subscribeToNothing = (): (() => void) => unsubscribeFromNothing;
const unsupportedOnTheServer = (): boolean => false;

/**
 * Whether the user can call from here: the deployment switched calls on and this browser
 * supports them. False on the server and in the first render, so the button never mismatches.
 */
export const useCanMakeCalls = (): boolean => {
  const trpc = useTRPC();
  const { data: featureFlags } = useQuery(
    trpc.chat.getFeatureFlags.queryOptions(undefined, { staleTime: 30_000 }),
  );
  // read defensively: a cache persisted by the release before lacks the flag
  const isEnabled =
    featureFlags?.find((flag) => flag.key === flagDefinitions.voiceCallsEnabled.key)?.isEnabled ===
    true;
  const isSupported = useSyncExternalStore(
    subscribeToNothing,
    canMakeCalls,
    unsupportedOnTheServer,
  );
  return isEnabled && isSupported;
};

/** "02:14", counting from when the audio started to flow. */
export const useCallDuration = (connectedAt: number | undefined): string => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (connectedAt === undefined) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return (): void => clearInterval(interval);
  }, [connectedAt]);

  if (connectedAt === undefined) return '';
  const seconds = Math.max(0, Math.floor((now - connectedAt) / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
};
