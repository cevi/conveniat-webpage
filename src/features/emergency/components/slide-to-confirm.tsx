import { cn } from '@/utils/tailwindcss-override';
import { Check, ChevronRight, LoaderCircle } from 'lucide-react';
import React, { useCallback, useRef, useState } from 'react';

interface ConfirmationSliderProperties {
  onConfirm: () => Promise<void>;
  text?: string;
  pendingText?: string;
  confirmedText?: string;
}

export const ConfirmationSlider: React.FC<ConfirmationSliderProperties> = ({
  onConfirm,
  text = 'Slide to confirm',
  pendingText = 'Processing...',
  confirmedText = 'Confirmed!',
}) => {
  const trackReference = useRef<HTMLDivElement>(null);
  const handleReference = useRef<HTMLDivElement>(null);
  const isDraggingReference = useRef(false);
  const startXReference = useRef(0);
  const currentTranslateXReference = useRef(0);

  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [displayText, setDisplayText] = useState(text);
  const [isAnimating, setIsAnimating] = useState(true);
  // how far the handle is, for screen readers, in percent
  const [progress, setProgress] = useState(0);

  const resetSlider = useCallback(() => {
    if (!handleReference.current || isConfirmed) return;
    handleReference.current.style.transition = 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
    handleReference.current.style.transform = 'translateX(0px)';
    trackReference.current?.style.setProperty('--translate-x-clamped', '0px');
    currentTranslateXReference.current = 0;
    setProgress(0);
    setDisplayText(text);
    setTimeout(() => {
      if (handleReference.current) {
        handleReference.current.style.transition = '';
      }
      setIsAnimating(true);
    }, 200);
    setIsProcessing(false);
  }, [isConfirmed, text]);

  // Ensure slider is reset on mount
  React.useEffect(() => {
    setIsConfirmed(false);
    setDisplayText(text);
    setIsProcessing(false);
    setIsAnimating(true);
    if (handleReference.current) {
      handleReference.current.style.transform = 'translateX(0px)';
      handleReference.current.style.transition = '';
    }
    if (trackReference.current) {
      trackReference.current.style.setProperty('--translate-x-clamped', '0px');
    }
  }, [text]);

  /** Moves the handle to the end and raises the alarm, for the drag and the keyboard alike. */
  const completeSlide = useCallback(() => {
    if (!trackReference.current) return;
    const handleWidth = handleReference.current?.offsetWidth ?? 64;
    const endX = trackReference.current.offsetWidth - handleWidth - 16;
    currentTranslateXReference.current = endX;
    setProgress(100);
    setIsProcessing(true);
    setDisplayText(pendingText);
    setIsAnimating(false);
    if (handleReference.current) {
      handleReference.current.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      handleReference.current.style.transform = `translateX(${endX}px)`;
    }
    try {
      onConfirm()
        .then((): void => {
          setIsConfirmed(true);
          setIsProcessing(false);
          setDisplayText(confirmedText);
          if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
            navigator.vibrate(50);
          }
        })
        .catch(() => {
          resetSlider();
          setIsConfirmed(false);
          setIsProcessing(false);
          console.error('Confirmation failed, slider reset.');
        });
    } catch (error) {
      console.error('Confirmation failed:', error);
      setIsConfirmed(false);
      resetSlider();
    }
  }, [onConfirm, resetSlider, confirmedText, pendingText]);

  /**
   * The keyboard and screen reader way to slide: the arrow keys move the handle a quarter at a
   * time and it raises the alarm once it reaches the end, so a single key press never does.
   */
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (isConfirmed || isProcessing || !trackReference.current) return;
      const handleWidth = handleReference.current?.offsetWidth ?? 64;
      const maxTranslateX = trackReference.current.offsetWidth - handleWidth - 16;
      const step = maxTranslateX / 4;
      const current = currentTranslateXReference.current;
      let next: number;
      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowUp': {
          next = current + step;
          break;
        }
        case 'ArrowLeft':
        case 'ArrowDown': {
          next = current - step;
          break;
        }
        case 'Home': {
          next = 0;
          break;
        }
        default: {
          return;
        }
      }
      event.preventDefault();
      next = Math.min(Math.max(0, next), maxTranslateX);
      if (next >= maxTranslateX - 1) {
        completeSlide();
        return;
      }
      currentTranslateXReference.current = next;
      setProgress(Math.round((next / maxTranslateX) * 100));
      setIsAnimating(next === 0);
      if (handleReference.current) {
        handleReference.current.style.transition = 'transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)';
        handleReference.current.style.transform = `translateX(${next}px)`;
      }
      trackReference.current.style.setProperty('--translate-x-clamped', `${next}px`);
    },
    [completeSlide, isConfirmed, isProcessing],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      if (!isDraggingReference.current || !trackReference.current || isConfirmed || isProcessing)
        return;

      const deltaX = event.clientX - startXReference.current;
      const handleWidth = handleReference.current?.offsetWidth ?? 64;
      const trackWidth = trackReference.current.offsetWidth;
      const maxTranslateX = trackWidth - handleWidth - 16;
      const clampedTranslateX = Math.min(Math.max(0, deltaX), maxTranslateX);

      currentTranslateXReference.current = clampedTranslateX;

      const textSwitchThreshold = maxTranslateX * 0.75;
      if (clampedTranslateX > textSwitchThreshold) {
        setDisplayText(pendingText);
        setIsProcessing(true);
      } else {
        setDisplayText(text);
        setIsProcessing(false);
      }

      if (handleReference.current) {
        handleReference.current.style.transform = `translateX(${clampedTranslateX}px)`;
      }
      trackReference.current.style.setProperty('--translate-x-clamped', `${clampedTranslateX}px`);

      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(5);
      }
    },
    [isConfirmed, isProcessing, text, pendingText],
  );

  const handlePointerUp = useCallback(
    function onPointerUp() {
      if (!isDraggingReference.current || !trackReference.current || isConfirmed || isProcessing)
        return;
      isDraggingReference.current = false;

      const handleWidth = handleReference.current?.offsetWidth ?? 64;
      const trackWidth = trackReference.current.offsetWidth;
      const triggerThreshold = trackWidth * 0.75 - handleWidth - 16;

      if (currentTranslateXReference.current >= triggerThreshold) {
        completeSlide();
      } else {
        resetSlider();
      }

      globalThis.removeEventListener('pointermove', handlePointerMove);
      globalThis.removeEventListener('pointerup', onPointerUp);
    },
    [handlePointerMove, completeSlide, resetSlider, isConfirmed, isProcessing],
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (isDraggingReference.current || isConfirmed || isProcessing) return;

      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);

      isDraggingReference.current = true;
      startXReference.current = event.clientX;
      setIsAnimating(false);

      if (handleReference.current) {
        handleReference.current.style.transition = 'none';
      }

      globalThis.addEventListener('pointermove', handlePointerMove);
      globalThis.addEventListener('pointerup', handlePointerUp);
    },
    [handlePointerMove, handlePointerUp, isConfirmed, isProcessing],
  );

  return (
    <div className="mx-auto w-full max-w-md p-4">
      <div
        ref={trackReference}
        className={cn(
          'relative flex h-16 cursor-grab items-center rounded-full transition-all duration-500',
          {
            'bg-conveniat-green': isConfirmed,
            'bg-red-600 hover:bg-red-700': !isConfirmed,
            'cursor-not-allowed': isProcessing,
          },
        )}
        onPointerDown={handlePointerDown}
        onKeyDown={handleKeyDown}
        // a handle left halfway by the keyboard goes back once the focus leaves
        onBlur={() => {
          if (!isConfirmed && !isProcessing && currentTranslateXReference.current > 0) {
            resetSlider();
          }
        }}
        role="slider"
        tabIndex={isConfirmed ? -1 : 0}
        aria-label={text}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={isConfirmed ? 100 : progress}
        aria-valuetext={displayText}
        aria-disabled={isConfirmed || isProcessing}
        style={{ touchAction: 'none' }}
      >
        <div
          className={cn('absolute left-2 h-12 w-12 rounded-full', {
            'animate-ping bg-red-400 opacity-50': !isConfirmed && isAnimating && !isProcessing,
          })}
        ></div>

        <div
          ref={handleReference}
          className={cn(
            'relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-md',
            {
              'left-2': isConfirmed,
              'absolute left-2': !isConfirmed,
              'animate-jump-x': !isConfirmed && isAnimating && !isProcessing,
            },
          )}
        >
          {!isConfirmed && isAnimating && !isProcessing && (
            <div className="bg-quiet absolute inset-0 animate-pulse rounded-full opacity-50"></div>
          )}

          {isConfirmed && <Check className="text-conveniat-green relative z-10" size={24} />}
          {!isConfirmed && isProcessing && (
            <LoaderCircle className="relative z-10 animate-spin text-red-700" size={24} />
          )}
          {!isConfirmed && !isProcessing && (
            <ChevronRight className="relative z-10 text-red-700" size={24} />
          )}
        </div>

        <div
          className={cn(
            'pointer-events-none absolute left-1/2 -translate-x-1/2 transform text-base font-semibold text-white',
            {
              'opacity-100': isConfirmed,
            },
          )}
        >
          {displayText}
        </div>
      </div>
    </div>
  );
};
