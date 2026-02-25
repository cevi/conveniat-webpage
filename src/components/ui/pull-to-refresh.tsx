'use client';

import { cn } from '@/utils/tailwindcss-override';
import { animate, motion, useMotionValue } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import type React from 'react';
import { useCallback, useState } from 'react';
import { OfflineLogo } from '@/components/ui/offline-logo';

interface PullToRefreshProperties {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
  pullThreshold?: number;
}

export const PullToRefresh: React.FC<PullToRefreshProperties> = ({
  onRefresh,
  children,
  className,
  pullThreshold = 80,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const y = useMotionValue(0);

  const handleDragEnd = useCallback((): void => {
    const currentY = y.get();

    if (currentY >= pullThreshold && !isRefreshing) {
      setIsRefreshing(true);

      // Keep it at a fixed position while refreshing
      animate(y, 60, { type: 'spring', stiffness: 300, damping: 30 });

      if (navigator.onLine === false) {
        // we are offline, show the offline logo and
        // hide the icon after a second
        setTimeout(() => {
          setIsRefreshing(false);
          animate(y, 0, { type: 'spring', stiffness: 300, damping: 30 });
        }, 1000);
      } else {
        void onRefresh().finally(() => {
          setIsRefreshing(false);
          animate(y, 0, { type: 'spring', stiffness: 300, damping: 30 });
        });
      }
    } else {
      animate(y, 0, { type: 'spring', stiffness: 500, damping: 30 });
    }
  }, [y, pullThreshold, isRefreshing, onRefresh]);

  return (
    <div className={cn('relative', className)}>
      {/* Spinner shown only while refreshing */}
      {isRefreshing && (
        <div className="absolute top-4 left-0 z-20 flex w-full justify-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md">
            {navigator.onLine ? (
              <Loader2 className="text-conveniat-green h-6 w-6 animate-spin" />
            ) : (
              <OfflineLogo />
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.5}
        onDragEnd={handleDragEnd}
        style={{ y }}
        className="relative z-10"
      >
        {children}
      </motion.div>
    </div>
  );
};
