'use client';
import type { Typist } from '@/features/chat/utils/typing-store';
import { getNoTypists, getTypists, subscribeTyping } from '@/features/chat/utils/typing-store';
import { useTRPC } from '@/trpc/client';
import { useCallback, useRef, useSyncExternalStore } from 'react';

import { useMutation } from '@tanstack/react-query';

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
  const trpc = useTRPC();
  const signalTyping = useMutation(trpc.chat.signalTyping.mutationOptions());
  const lastSentAtReference = useRef(0);

  return useCallback((): void => {
    const now = Date.now();
    if (!navigator.onLine || chatId === '') return;
    if (now - lastSentAtReference.current < TYPING_SIGNAL_INTERVAL_MS) return;
    lastSentAtReference.current = now;
    signalTyping.mutate({ chatId, parentId });
  }, [chatId, parentId, signalTyping]);
};
