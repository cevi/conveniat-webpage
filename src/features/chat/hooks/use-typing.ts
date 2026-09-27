'use client';

import type { Typist } from '@/features/chat/utils/typing-store';
import { getNoTypists, getTypists, subscribeTyping } from '@/features/chat/utils/typing-store';
import { trpc } from '@/trpc/client';
import { useCallback, useRef, useSyncExternalStore } from 'react';

/** How often a typist repeats the signal; below the receivers' expiry so the dots stay put. */
const TYPING_SIGNAL_INTERVAL_MS = 2500;

/** The other people currently typing in the chat, or in one of its threads. */
export const useTypists = (chatId: string, parentId: string | undefined): Typist[] =>
  useSyncExternalStore(subscribeTyping, () => getTypists(chatId, parentId), getNoTypists);

/**
 * Returns a callback for every keystroke that tells the other members this user is typing,
 * at most once per {@link TYPING_SIGNAL_INTERVAL_MS}. Offline it does nothing: a typing
 * signal replayed later would be a lie.
 */
export const useTypingSignal = (chatId: string, parentId: string | undefined): (() => void) => {
  const signalTyping = trpc.chat.signalTyping.useMutation();
  const lastSentAtReference = useRef(0);

  return useCallback((): void => {
    const now = Date.now();
    if (!navigator.onLine || chatId === '') return;
    if (now - lastSentAtReference.current < TYPING_SIGNAL_INTERVAL_MS) return;
    lastSentAtReference.current = now;
    signalTyping.mutate({ chatId, parentId });
  }, [chatId, parentId, signalTyping]);
};
