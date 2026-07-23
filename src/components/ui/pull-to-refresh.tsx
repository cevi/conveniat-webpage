'use client';

import { OfflineLogo } from '@/components/ui/offline-logo';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { cn } from '@/utils/tailwindcss-override';
import { animate, motion, useMotionValue } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import type React from 'react';
import { useCallback, useRef, useState } from 'react';

interface PullToRefreshProperties {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
  pullThreshold?: number;
}

const getScrollTop = (): number => {
  // eslint-disable-next-line unicorn/prefer-global-this
  if (typeof window === 'undefined') return 0;
  if (globalThis.scrollY > 0) return globalThis.scrollY;
  if (document.documentElement.scrollTop > 0) return document.documentElement.scrollTop;
  return 0;
};

export const PullToRefresh: React.FC<PullToRefreshProperties> = ({
  onRefresh,
  children,
  className,
  pullThreshold = 80,
}) => {
  const isOnline = useOnlineStatus();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pullDistance = useMotionValue(0);
  const containerReference = useRef<HTMLDivElement>(null);
  const startYReference = useRef<number | undefined>(undefined);
  const isPullingReference = useRef(false);

  const triggerRefresh = useCallback(async (): Promise<void> => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    animate(pullDistance, 60, { type: 'spring', stiffness: 300, damping: 30 });

    try {
      await (isOnline ? onRefresh() : new Promise((resolve) => setTimeout(resolve, 1000)));
    } finally {
      setIsRefreshing(false);
      animate(pullDistance, 0, { type: 'spring', stiffness: 300, damping: 30 });
    }
  }, [isRefreshing, isOnline, onRefresh, pullDistance]);

  const handleTouchStart = useCallback(
    (event: React.TouchEvent<HTMLDivElement>): void => {
      const touch = event.touches[0];
      const scrollTop = getScrollTop();
      if (scrollTop <= 0 && !isRefreshing && touch) {
        startYReference.current = touch.clientY;
        isPullingReference.current = false;
      } else {
        startYReference.current = undefined;
      }
    },
    [isRefreshing],
  );

  const handleTouchMove = useCallback(
    (event: React.TouchEvent<HTMLDivElement>): void => {
      const touch = event.touches[0];
      if (startYReference.current === undefined || isRefreshing || !touch) return;

      const currentY = touch.clientY;
      const dy = currentY - startYReference.current;
      const scrollTop = getScrollTop();

      if (scrollTop <= 0 && dy > 0) {
        isPullingReference.current = true;
        const distance = Math.min(dy * 0.45, pullThreshold * 1.5);
        pullDistance.set(distance);
      } else if (isPullingReference.current && dy <= 0) {
        pullDistance.set(0);
        isPullingReference.current = false;
      }
    },
    [isRefreshing, pullDistance, pullThreshold],
  );

  const handleTouchEnd = useCallback((): void => {
    if (startYReference.current === undefined) return;
    startYReference.current = undefined;

    if (isPullingReference.current) {
      isPullingReference.current = false;
      const currentDistance = pullDistance.get();
      if (currentDistance >= pullThreshold * 0.45) {
        void triggerRefresh();
      } else {
        animate(pullDistance, 0, { type: 'spring', stiffness: 400, damping: 30 });
      }
    }
  }, [pullDistance, pullThreshold, triggerRefresh]);

  const renderIcon = (): React.ReactNode => {
    if (isRefreshing) {
      return isOnline ? (
        <Loader2 className="text-conveniat-green h-6 w-6 animate-spin" />
      ) : (
        <OfflineLogo className="h-6 w-6 text-gray-400" />
      );
    }
    return (
      <Loader2
        className="text-conveniat-green h-6 w-6 transition-transform"
        style={{ transform: `rotate(${Math.min(pullDistance.get() * 3, 360)}deg)` }}
      />
    );
  };

  return (
    <div
      ref={containerReference}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className={cn('relative', className)}
    >
      {/* Refresh Spinner Indicator */}
      {(isRefreshing || pullDistance.get() > 0) && (
        <div className="pointer-events-none absolute top-2 left-0 z-20 flex w-full justify-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-100 bg-white shadow-md">
            {renderIcon()}
          </div>
        </div>
      )}

      {/* Content */}
      <motion.div style={{ y: pullDistance }} className="relative z-10">
        {children}
      </motion.div>
    </div>
  );
};
