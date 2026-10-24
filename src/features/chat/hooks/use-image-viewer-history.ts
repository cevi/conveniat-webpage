'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const HISTORY_KEY = 'chatImage';

const isOpenInHistory = (image: string): boolean =>
  (globalThis.history.state as Record<string, unknown> | null)?.[HISTORY_KEY] === image;

export interface ImageViewerHistory {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

/**
 * Opens a chat image full screen as its own history entry, so the phone's back gesture closes the
 * image instead of leaving the chat. The entry keeps the address and only marks the image in its
 * state; Next.js copies its router state into it, so going back to the chat needs no navigation.
 *
 * Whether the image is open is read from the current entry, not kept on its own: Next.js keeps a
 * chat that was left alive in the background, and with state of its own the image was still open
 * when the chat came back.
 */
export const useImageViewerHistory = (image: string): ImageViewerHistory => {
  const [isOpen, setIsOpen] = useState(false);
  // the step back lands a tick later; until then the entry still names the image
  const isGoingBack = useRef(false);

  // runs again when a chat kept in the background comes back
  useEffect(() => {
    const follow = (): void => {
      isGoingBack.current = false;
      setIsOpen(isOpenInHistory(image));
    };
    follow();
    globalThis.addEventListener('popstate', follow);
    return (): void => globalThis.removeEventListener('popstate', follow);
  }, [image]);

  const open = useCallback((): void => {
    globalThis.history.pushState({ [HISTORY_KEY]: image }, '');
    setIsOpen(true);
  }, [image]);

  const close = useCallback((): void => {
    // the back gesture has already left the entry; the close button and Escape still have to.
    // A tap on the close button also reaches the viewer's own tap-to-close, and a second step
    // back would leave the chat.
    if (isOpenInHistory(image)) {
      if (!isGoingBack.current) globalThis.history.back();
      isGoingBack.current = true;
      return;
    }
    setIsOpen(false);
  }, [image]);

  return { isOpen, open, close };
};
