'use client';

import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { ChevronLeft, ChevronRight, LoaderCircle } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useCurrentLocale } from 'next-i18n-router/client';
import React, { useCallback, useEffect, useRef, useState } from 'react';

const statusLabel: StaticTranslationString = {
  de: 'Dein Status:',
  en: 'Your status:',
  fr: 'Votre statut:',
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

      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(5);
      }
    },
    [isProcessing],
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
      }

      globalThis.removeEventListener('pointermove', handlePointerMove);
      globalThis.removeEventListener('pointerup', onPointerUp);
    },
    [
      handlePointerMove,
      resetSlider,
      isProcessing,
      isPresent,
      locale,
      trpcUtils.presence.getPresence,
      refetch,
      updatePresenceMutation,
    ],
  );

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

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between px-2">
        <span className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
          {statusLabel[locale]}
        </span>
        <div className="flex items-center gap-2">
          <span
            className={cn('inline-block h-2 w-2 rounded-full', {
              'bg-green-500 shadow-[0_0_8px_rgba(93,111,99,0.6)]':
                isPresent && !isOutsideTrackingPeriod,
              'bg-cevi-blue shadow-[0_0_8px_rgba(50,51,148,0.6)]':
                !isPresent && !isOutsideTrackingPeriod,
              'bg-gray-400': isOutsideTrackingPeriod,
            })}
          />
          <span className="text-sm font-semibold text-gray-800">{displayStatusLabel}</span>
        </div>
      </div>

      <div
        ref={trackReference}
        className={cn('relative flex h-16 items-center rounded-full transition-all duration-500', {
          'border border-green-500/20 bg-green-500/10': isPresent && !isOutsideTrackingPeriod,
          'border-cevi-blue/20 bg-cevi-blue/10 border': !isPresent && !isOutsideTrackingPeriod,
          'cursor-not-allowed border-gray-200 bg-gray-50 opacity-60': isOutsideTrackingPeriod,
          'cursor-grab': !isProcessing && !isOutsideTrackingPeriod,
          'cursor-not-allowed': isProcessing,
        })}
        onPointerDown={handlePointerDown}
        style={{ touchAction: 'none' }}
      >
        <div
          ref={handleReference}
          className={cn(
            'relative z-10 flex h-12 w-12 items-center justify-center rounded-full shadow-md transition-all duration-300',
            {
              'absolute left-2': true,
              'border border-green-700/10 bg-green-600': isPresent && !isOutsideTrackingPeriod,
              'border-cevi-blue/10 bg-cevi-blue border': !isPresent && !isOutsideTrackingPeriod,
              'cursor-not-allowed border-gray-300 bg-gray-400': isOutsideTrackingPeriod,
              'hover:shadow-lg': !isOutsideTrackingPeriod,
            },
          )}
        >
          {renderHandleIcon()}
        </div>

        <div
          className={cn(
            'pointer-events-none absolute left-1/2 -translate-x-1/2 transform text-xs font-bold tracking-wider uppercase select-none',
            {
              'text-green-800': isPresent && !isOutsideTrackingPeriod,
              'text-cevi-blue': !isPresent && !isOutsideTrackingPeriod,
              'text-gray-400': isOutsideTrackingPeriod,
            },
          )}
        >
          {displayText}
        </div>
      </div>
    </div>
  );
};
