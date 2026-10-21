'use client';

import type React from 'react';
import { useCallback, useEffect, useRef } from 'react';

/** How long a finger rests on a row before its actions open. */
const LONG_PRESS_MS = 450;
/** How far the finger may drift, e.g. starting a scroll or a swipe, before it is no press. */
const MOVE_TOLERANCE_PX = 10;

export interface LongPressHandlers {
  onPointerDown: (event: React.PointerEvent) => void;
  onPointerMove: (event: React.PointerEvent) => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
  onPointerLeave: () => void;
  onContextMenu: (event: React.MouseEvent) => void;
  onKeyDown: (event: React.KeyboardEvent) => void;
  onClickCapture: (event: React.MouseEvent) => void;
}

/**
 * Opens something for an element on a long press of a finger, on a right click, and on the
 * context-menu key or Shift+F10, while a plain tap keeps doing what it does. The tap that ends
 * a long press is swallowed, so the press does not also open the link underneath. A light
 * vibration confirms the press where the phone has one.
 *
 * @param onLongPress - what the press opens
 */
export const useLongPress = (onLongPress: () => void): LongPressHandlers => {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const start = useRef<{ x: number; y: number } | undefined>(undefined);
  const hasFired = useRef(false);

  const cancel = useCallback((): void => {
    if (timer.current !== undefined) clearTimeout(timer.current);
    timer.current = undefined;
    start.current = undefined;
  }, []);

  // a row that unmounts mid-press must not open anything afterwards
  useEffect(() => cancel, [cancel]);

  const fire = useCallback((): void => {
    hasFired.current = true;
    onLongPress();
  }, [onLongPress]);

  return {
    onPointerDown: (event): void => {
      hasFired.current = false;
      // a mouse has its right button for this; only fingers and pens wait
      if (event.pointerType === 'mouse') return;
      cancel();
      start.current = { x: event.clientX, y: event.clientY };
      timer.current = setTimeout(() => {
        timer.current = undefined;
        // not every browser has it, Safari above all
        if ('vibrate' in navigator) navigator.vibrate(10);
        fire();
      }, LONG_PRESS_MS);
    },
    onPointerMove: (event): void => {
      if (start.current === undefined) return;
      const distance = Math.hypot(event.clientX - start.current.x, event.clientY - start.current.y);
      if (distance > MOVE_TOLERANCE_PX) cancel();
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
    onPointerLeave: cancel,
    onContextMenu: (event): void => {
      // the browser's own menu would cover the sheet; Android also sends this on a long press
      event.preventDefault();
      if (hasFired.current) return;
      // during a touch, the tap that ends it must not open the link as well
      const isTouchPress = start.current !== undefined;
      cancel();
      if (isTouchPress) fire();
      else onLongPress();
    },
    onKeyDown: (event): void => {
      if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
        event.preventDefault();
        onLongPress();
      }
    },
    onClickCapture: (event): void => {
      if (!hasFired.current) return;
      hasFired.current = false;
      event.preventDefault();
      event.stopPropagation();
    },
  };
};
