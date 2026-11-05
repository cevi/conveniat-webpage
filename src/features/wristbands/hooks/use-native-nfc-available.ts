'use client';

import { isNativeNfcAvailable } from '@/features/wristbands/native-nfc';
import { useSyncExternalStore } from 'react';

/** The bridge is injected before the page loads and never goes away: nothing to listen to. */
const unsubscribe = (): void => {};
const subscribe = (): (() => void) => unsubscribe;

/** The server cannot know whether the page will run in the native app. */
const unknownOnServer = (): boolean | undefined => undefined;

/**
 * Whether the page runs in the native app with its NFC bridge, or `undefined` while hydrating:
 * the server cannot know, and guessing "no" would flash the notice for a browser in the app.
 */
export const useNativeNfcAvailable = (): boolean | undefined =>
  useSyncExternalStore<boolean | undefined>(subscribe, isNativeNfcAvailable, unknownOnServer);
