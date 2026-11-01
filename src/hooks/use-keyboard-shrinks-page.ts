'use client';

import { useEffect, useState } from 'react';

/** Less than this is a browser's address bar coming and going, not a keyboard. */
const KEYBOARD_MIN_HEIGHT = 150;

/**
 * Whether the on-screen keyboard has made the page shorter. Only the Android app does that, by
 * shrinking its WebView to the top of the keyboard; browsers and older apps lay the keyboard over
 * the page and leave its height alone. Compares the page's height with the tallest one seen at
 * the same width, so turning the phone starts over. False on the server and in the first render.
 *
 * @returns true while the page is at least a keyboard's height shorter than it was
 */
export const useKeyboardShrinksPage = (): boolean => {
  const [keyboardShrinksPage, setKeyboardShrinksPage] = useState(false);

  useEffect(() => {
    const tallestByWidth = new Map<number, number>();
    const measure = (): void => {
      const { innerWidth, innerHeight } = globalThis;
      const tallest = Math.max(tallestByWidth.get(innerWidth) ?? 0, innerHeight);
      tallestByWidth.set(innerWidth, tallest);
      setKeyboardShrinksPage(tallest - innerHeight >= KEYBOARD_MIN_HEIGHT);
    };

    measure();
    globalThis.addEventListener('resize', measure);
    return (): void => globalThis.removeEventListener('resize', measure);
  }, []);

  return keyboardShrinksPage;
};
