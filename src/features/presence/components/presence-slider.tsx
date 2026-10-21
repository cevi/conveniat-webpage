'use client';

import { SectionLabel } from '@/components/ui/section-label';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { ChevronLeft, ChevronRight, LoaderCircle } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useCurrentLocale } from 'next-i18n-router/client';
import React, { useCallback, useEffect, useRef, useState } from 'react';

const statusLabel: StaticTranslationString = {
  de: 'Dein Status',
  en: 'Your status',
  fr: 'Ton statut',
};

const presentLabel: StaticTranslationString = {
  de: 'Anwesend auf dem Lagerplatz',
  en: 'Present on the campsite',
  fr: 'Présent sur le terrain de camp',
};

const absentLabel: StaticTranslationString = {
  de: 'Abwesend vom Lagerplatz',
  en: 'Absent from the campsite',
  fr: 'Absent du terrain de camp',
};

const slideToPresentText: StaticTranslationString = {
  de: 'Schieben für anwesend',
  en: 'Slide to mark as present',
  fr: 'Glisser pour marquer présent',
};

const slideToAbsentText: StaticTranslationString = {
  de: 'Schieben für abwesend',
  en: 'Slide to mark as absent',
  fr: 'Glisser pour marquer absent',
};

const updatingText: StaticTranslationString = {
  de: 'Wird aktualisiert...',
  en: 'Updating...',
  fr: 'Mise à jour...',
};

const outsidePeriodText: StaticTranslationString = {
  de: 'Ausserhalb des Erfassungszeitraums',
  en: 'Outside the tracking period',
  fr: 'En dehors de la période de suivi',
};

export const PresenceSlider: React.FC = () => {
  const { status } = useSession();
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const trpcUtils = trpc.useUtils();

  const {
    data: presenceData,
    isLoading,
    refetch,
  } = trpc.presence.getPresence.useQuery(undefined, {
    enabled: status === 'authenticated',
    staleTime: 1000 * 60 * 5,
  });

  const isPresent = presenceData?.isPresent;
  const isOutsideTrackingPeriod = presenceData?.isOutsideTrackingPeriod ?? false;

  const updatePresenceMutation = trpc.presence.updatePresence.useMutation();

  const trackReference = useRef<HTMLDivElement>(null);
  const handleReference = useRef<HTMLDivElement>(null);
  const isDraggingReference = useRef(false);
  const startXReference = useRef(0);
  const startHandleXReference = useRef(0);
  const currentTranslateXReference = useRef(0);

  const [isProcessing, setIsProcessing] = useState(false);
  const [displayText, setDisplayText] = useState('');
  // Sync state to slider position
  useEffect(() => {
    if (
      isPresent !== undefined &&
      !isDraggingReference.current &&
      handleReference.current &&
      trackReference.current
    ) {
      const trackWidth = trackReference.current.offsetWidth;
      const handleWidth = handleReference.current.offsetWidth;
      const maxTranslateX = trackWidth - handleWidth - 16; // 8px padding on each side
      const targetX = isPresent ? maxTranslateX : 0;
      handleReference.current.style.transform = `translateX(${targetX}px)`;
      trackReference.current.style.setProperty('--translate-x-clamped', `${targetX}px`);
    }
  }, [isPresent]);

  let activeText = '';
  if (isOutsideTrackingPeriod) {
    activeText = outsidePeriodText[locale];
  } else if (isPresent) {
    activeText = slideToAbsentText[locale];
  } else {
    activeText = slideToPresentText[locale];
  }

  let displayStatusLabel = '';
  if (isOutsideTrackingPeriod) {
    displayStatusLabel = outsidePeriodText[locale];
  } else if (isPresent) {
    displayStatusLabel = presentLabel[locale];
  } else {
    displayStatusLabel = absentLabel[locale];
  }

  useEffect(() => {
    if (!isProcessing) {
      setDisplayText(activeText);
    }
  }, [isPresent, locale, activeText, isProcessing, isOutsideTrackingPeriod]);

  // Adjust handle position on resize
  useEffect((): (() => void) => {
    const handleResize = (): void => {
      if (handleReference.current && trackReference.current && isPresent !== undefined) {
        const trackWidth = trackReference.current.offsetWidth;
        const handleWidth = handleReference.current.offsetWidth;
        const maxTranslateX = trackWidth - handleWidth - 16;
        const targetX = isPresent ? maxTranslateX : 0;
        handleReference.current.style.transform = `translateX(${targetX}px)`;
        trackReference.current.style.setProperty('--translate-x-clamped', `${targetX}px`);
      }
    };

    window.addEventListener('resize', handleResize);
    return (): void => {
      window.removeEventListener('resize', handleResize);
    };
  }, [isPresent]);

  const resetSlider = useCallback(() => {
    if (!handleReference.current || !trackReference.current) return;
    const trackWidth = trackReference.current.offsetWidth;
    const handleWidth = handleReference.current.offsetWidth;
    const maxTranslateX = trackWidth - handleWidth - 16;
    const targetX = isPresent ? maxTranslateX : 0;

    handleReference.current.style.transition = 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)';
    handleReference.current.style.transform = `translateX(${targetX}px)`;
    trackReference.current.style.setProperty('--translate-x-clamped', `${targetX}px`);
    setDisplayText(activeText);

    setTimeout(() => {
      if (handleReference.current) {
        handleReference.current.style.transition = '';
      }
    }, 250);
    setIsProcessing(false);
  }, [isPresent, activeText]);

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      if (!isDraggingReference.current || !trackReference.current || isProcessing) return;

      const deltaX = event.clientX - startXReference.current;
      const handleWidth = handleReference.current?.offsetWidth ?? 48;
      const trackWidth = trackReference.current.offsetWidth;
      const maxTranslateX = trackWidth - handleWidth - 16;

      const newX = startHandleXReference.current + deltaX;
      const clampedTranslateX = Math.min(Math.max(0, newX), maxTranslateX);

      currentTranslateXReference.current = clampedTranslateX;

      if (handleReference.current) {
        handleReference.current.style.transform = `translateX(${clampedTranslateX}px)`;
      }
      trackReference.current.style.setProperty('--translate-x-clamped', `${clampedTranslateX}px`);
    },
    [isProcessing],
  );

  /** Moves the handle to the side asked for and saves the presence, by drag or by keyboard. */
  const commitPresence = useCallback(
    (targetPresentState: boolean): void => {
      if (!trackReference.current) return;
      const handleWidth = handleReference.current?.offsetWidth ?? 48;
      const maxTranslateX = trackReference.current.offsetWidth - handleWidth - 16;

      setIsProcessing(true);
      setDisplayText(updatingText[locale]);

      if (handleReference.current) {
        handleReference.current.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        handleReference.current.style.transform = `translateX(${targetPresentState ? maxTranslateX : 0}px)`;
      }

      updatePresenceMutation.mutate(
        { presentAtCamp: targetPresentState },
        {
          onSuccess: () => {
            void (async (): Promise<void> => {
              await trpcUtils.presence.getPresence.invalidate();
              await refetch();
              if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
                navigator.vibrate(50);
              }
              setIsProcessing(false);
            })();
          },
          onError: (error) => {
            console.error('Failed to update presence:', error);
            resetSlider();
          },
        },
      );
    },
    [locale, refetch, resetSlider, trpcUtils.presence.getPresence, updatePresenceMutation],
  );

  const handlePointerUp = useCallback(
    function onPointerUp() {
      if (!isDraggingReference.current || !trackReference.current || isProcessing) return;
      isDraggingReference.current = false;

      const handleWidth = handleReference.current?.offsetWidth ?? 48;
      const trackWidth = trackReference.current.offsetWidth;
      const maxTranslateX = trackWidth - handleWidth - 16;

      // Determine target state based on where the handle was released
      const releasePercentage = currentTranslateXReference.current / maxTranslateX;
      const targetPresentState = releasePercentage > 0.5;

      if (targetPresentState === isPresent) {
        resetSlider();
      } else {
        commitPresence(targetPresentState);
      }

      globalThis.removeEventListener('pointermove', handlePointerMove);
      globalThis.removeEventListener('pointerup', onPointerUp);
    },
    [handlePointerMove, resetSlider, isProcessing, isPresent, commitPresence],
  );

  // the same as dragging the handle across, for a keyboard and a screen reader
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    if (isProcessing || isOutsideTrackingPeriod) return;
    commitPresence(isPresent !== true);
  };

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (
        isDraggingReference.current ||
        isProcessing ||
        isOutsideTrackingPeriod ||
        !handleReference.current ||
        !trackReference.current
      )
        return;

      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);

      const trackWidth = trackReference.current.offsetWidth;
      const handleWidth = handleReference.current.offsetWidth;
      const maxTranslateX = trackWidth - handleWidth - 16;

      isDraggingReference.current = true;
      startXReference.current = event.clientX;
      startHandleXReference.current = isPresent ? maxTranslateX : 0;
      currentTranslateXReference.current = startHandleXReference.current;

      handleReference.current.style.transition = 'none';

      globalThis.addEventListener('pointermove', handlePointerMove);
      globalThis.addEventListener('pointerup', handlePointerUp);
    },
    [handlePointerMove, handlePointerUp, isProcessing, isPresent, isOutsideTrackingPeriod],
  );

  useEffect((): (() => void) => {
    return (): void => {
      globalThis.removeEventListener('pointermove', handlePointerMove);
      globalThis.removeEventListener('pointerup', handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  if (status !== 'authenticated' || isLoading) {
    // eslint-disable-next-line unicorn/no-null
    return null;
  }

  const renderHandleIcon = (): React.ReactElement | null => {
    if (isProcessing) {
      return <LoaderCircle className="relative z-10 animate-spin text-white" size={24} />;
    }
    if (isOutsideTrackingPeriod) {
      // eslint-disable-next-line unicorn/no-null
      return null;
    }
    if (isPresent) {
      return <ChevronLeft className="relative z-10 text-white" size={24} />;
    }
    return <ChevronRight className="relative z-10 text-white" size={24} />;
  };

  const isActive = !isOutsideTrackingPeriod;
  const isActivePresent = isActive && isPresent === true;

  return (
    <section className="space-y-2">
      <SectionLabel>{statusLabel[locale]}</SectionLabel>
      <div className="border-line rounded-[14px] border bg-white p-3">
        <p className="mb-3 flex items-center gap-2 px-1 text-[15px] font-semibold text-green-900">
          <span
            className={cn('inline-block h-2.5 w-2.5 shrink-0 rounded-full transition-colors', {
              'bg-conveniat-green ring-tint-line ring-4': isActivePresent,
              'bg-green-400': isActive && isPresent !== true,
              'bg-gray-300': isOutsideTrackingPeriod,
            })}
            aria-hidden="true"
          />
          {displayStatusLabel}
        </p>

        <div
          ref={trackReference}
          className={cn(
            'focus-visible:ring-conveniat-green relative flex h-14 items-center rounded-full border transition-colors focus-visible:ring-2 focus-visible:outline-hidden',
            {
              'border-tint-line bg-tint': isActivePresent,
              'border-line bg-quiet': isActive && isPresent !== true,
              'border-line bg-quiet cursor-not-allowed opacity-60': isOutsideTrackingPeriod,
              'cursor-grab': !isProcessing && isActive,
              'cursor-not-allowed': isProcessing,
            },
          )}
          onPointerDown={handlePointerDown}
          onKeyDown={handleKeyDown}
          role="switch"
          tabIndex={isActive ? 0 : -1}
          aria-checked={isPresent === true}
          aria-disabled={!isActive || isProcessing}
          aria-label={statusLabel[locale]}
          style={{ touchAction: 'none' }}
        >
          <div
            ref={handleReference}
            className={cn(
              'absolute left-2 z-10 flex h-11 w-11 items-center justify-center rounded-full',
              isActive ? 'bg-conveniat-green' : 'cursor-not-allowed bg-gray-300',
            )}
          >
            {renderHandleIcon()}
          </div>

          <div
            className={cn(
              'pointer-events-none absolute left-1/2 -translate-x-1/2 transform text-[13px] font-semibold whitespace-nowrap select-none',
              isActive ? 'text-green-700' : 'text-green-500',
            )}
          >
            {displayText}
          </div>
        </div>
      </div>
    </section>
  );
};
