import { Skeleton } from '@/components/ui/skeleton';
import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { useCallback, useEffect } from 'react';

interface ScheduleModalWrapperProperties {
  children: React.ReactNode;
  title: string | React.ReactNode;
  rightAction?: React.ReactNode;
  isLoading?: boolean;
}

/**
 * Modal wrapper that provides the overlay and close functionality
 * for intercepted schedule detail routes.
 */
export const ScheduleModalWrapper: React.FC<ScheduleModalWrapperProperties> = ({
  children,
  title,
  rightAction,
  isLoading = false,
}) => {
  const router = useRouter();

  const handleClose = useCallback((): void => {
    router.back();
  }, [router]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return (): void => document.removeEventListener('keydown', handleEscape);
  }, [handleClose]);

  return (
    <div className="fixed inset-0 z-[200] flex flex-col">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal Content */}
      <div className="relative z-10 flex h-full flex-col overflow-hidden bg-gray-50 sm:m-4 sm:rounded-2xl sm:shadow-2xl">
        {/* Header */}
        <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b-2 border-gray-200 bg-white px-4">
          <div className="flex items-center gap-3 overflow-hidden">
            <button
              onClick={handleClose}
              className="rounded-lg p-2 transition-colors hover:bg-gray-100"
              aria-label="Close"
            >
              <X className="h-5 w-5 text-gray-700" />
            </button>
            <div className="min-w-0 flex-1">
              {isLoading ? (
                <Skeleton className="h-6 w-3/4 max-w-[200px]" />
              ) : (
                <h1 className="font-heading truncate text-lg font-semibold text-gray-900">
                  {title}
                </h1>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center">
            {isLoading && !rightAction ? (
              <Skeleton className="h-8 w-8 rounded-full" />
            ) : (
              rightAction
            )}
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};
