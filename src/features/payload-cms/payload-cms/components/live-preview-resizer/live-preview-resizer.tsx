'use client';

import { usePreferences } from '@payloadcms/ui';
import type React from 'react';
import { useCallback, useEffect, useRef } from 'react';

const PREFERENCE_KEY = 'live-preview-width';
const DEFAULT_WIDTH = 60; // percent
const MIN_WIDTH = 25; // percent
const MAX_WIDTH = 65; // percent

/**
 * Helper to apply the width and active state to the DOM
 */
const applyWidthToDom = (newWidth: number): void => {
  document.documentElement.style.setProperty(
    '--live-preview-custom-width-val',
    newWidth.toString(),
  );
};

export const LivePreviewResizer: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { getPreference, setPreference } = usePreferences();

  const widthReference = useRef<number>(DEFAULT_WIDTH);
  const isDraggingReference = useRef(false);
  const animationFrameReference = useRef<number | null>(null);
  const handleReference = useRef<HTMLDivElement>(null);

  const setHandleActive = useCallback((active: boolean): void => {
    if (handleReference.current) {
      if (active) {
        handleReference.current.classList.add('live-preview-resize-handle--active');
      } else {
        handleReference.current.classList.remove('live-preview-resize-handle--active');
      }
    }
  }, []);

  // Optimized Mouse Move using requestAnimationFrame
  const handleMouseMove = useCallback((event: MouseEvent): void => {
    if (!isDraggingReference.current) return;

    if (animationFrameReference.current !== null) {
      cancelAnimationFrame(animationFrameReference.current);
    }

    animationFrameReference.current = requestAnimationFrame(() => {
      const viewportWidth = window.innerWidth;
      const newWidth = ((viewportWidth - event.clientX) / viewportWidth) * 100;
      const clampedWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, newWidth));

      widthReference.current = clampedWidth;
      applyWidthToDom(clampedWidth);
    });
  }, []);

  // Handle drag end
  const handleMouseUp = useCallback(
    function handleMouseUp(): void {
      isDraggingReference.current = false;
      setHandleActive(false);

      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

      document.body.style.cursor = '';
      document.body.style.userSelect = '';

      if (animationFrameReference.current !== null) {
        cancelAnimationFrame(animationFrameReference.current);
      }

      void setPreference(PREFERENCE_KEY, widthReference.current);
    },
    [handleMouseMove, setPreference, setHandleActive],
  );

  // Handle the drag start
  const handleMouseDown = useCallback(
    (event: React.MouseEvent): void => {
      event.preventDefault();
      isDraggingReference.current = true;
      setHandleActive(true);

      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [handleMouseMove, handleMouseUp, setHandleActive],
  );

  // Load saved preference on mount
  useEffect(() => {
    const loadPreference = async (): Promise<void> => {
      try {
        const savedWidth = await getPreference<number | undefined>(PREFERENCE_KEY);
        if (typeof savedWidth === 'number') {
          const clamped = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, savedWidth));
          widthReference.current = clamped;
          applyWidthToDom(clamped);
        }
      } catch {
        // Use default
      }
    };
    void loadPreference();
  }, [getPreference]);

  // Cleanup on unmount
  useEffect(() => {
    return (): void => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      if (animationFrameReference.current !== null) {
        cancelAnimationFrame(animationFrameReference.current);
      }
    };
  }, [handleMouseMove, handleMouseUp]);

  return (
    <div className="live-preview-resizer-container">
      {children}
      <div
        ref={handleReference}
        className="live-preview-resize-handle"
        onMouseDown={handleMouseDown}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize live preview panel"
        tabIndex={0}
      />
    </div>
  );
};

export default LivePreviewResizer;
