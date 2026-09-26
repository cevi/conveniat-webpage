'use client';

import { useEffect, useRef } from 'react';

const DRAFT_KEY_PREFIX = 'conveniat:chat-draft:';

/** Storage key of the draft for one chat, or for one thread inside it. */
export const getChatDraftKey = (chatId: string, threadId?: string): string =>
  `${DRAFT_KEY_PREFIX}${chatId}:${threadId ?? 'main'}`;

const readDraft = (key: string): string => {
  try {
    return localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
};

const writeDraft = (key: string, text: string): void => {
  try {
    if (text.trim() === '') localStorage.removeItem(key);
    else localStorage.setItem(key, text);
  } catch {
    // storage full or blocked: losing a draft is better than breaking the composer
  }
};

/**
 * Keeps the unsent text of a composer in localStorage, so leaving the chat, switching to
 * another one or the PWA being killed in the background does not throw the text away.
 *
 * The draft is restored after mount rather than in the initial state, because the server
 * render has no storage and a differing textarea value would fail hydration. Text that is
 * already there (a share target prefill) wins over the stored draft.
 */
export const useChatDraft = (
  draftKey: string,
  value: string,
  setValue: (update: (current: string) => string) => void,
): void => {
  const isRestoredReference = useRef(false);

  useEffect(() => {
    if (!isRestoredReference.current) {
      isRestoredReference.current = true;
      const draft = readDraft(draftKey);
      if (draft !== '') setValue((current) => (current === '' ? draft : current));
      return;
    }
    writeDraft(draftKey, value);
  }, [draftKey, value, setValue]);
};
