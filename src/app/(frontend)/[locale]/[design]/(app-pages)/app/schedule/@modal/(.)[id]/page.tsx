'use client';

import { useScheduleEntries } from '@/context/schedule-entries-context';
import type { CampScheduleEntry } from '@/features/payload-cms/payload-types';
import { DetailStarButton } from '@/features/schedule/components/detail-star-button';
import { ScheduleDetailContent } from '@/features/schedule/components/schedule-detail-content';
import { ScheduleDetailSkeleton } from '@/features/schedule/components/schedule-detail-skeleton';
import { ScheduleModalWrapper } from '@/features/schedule/components/schedule-modal-wrapper';
import { trpc } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { useCurrentLocale } from 'next-i18n-router/client';
import { useParams } from 'next/navigation';
import type React from 'react';

/**
 * Intercepting route for schedule details.
 * Shows the details in a modal overlay while keeping the schedule list visible.
 *
 * Uses TanStack DB cache for offline support, with TRPC fallback for deep links.
 */
const ScheduleDetailModal: React.FC = () => {
  const params = useParams();
  const idParameter = params['id'];
  const scheduleId = Array.isArray(idParameter) ? idParameter[0] : idParameter;
  const locale = useCurrentLocale(i18nConfig) as Locale;

  // 1. Try to find the entry in the local TanStack DB cache first (offline support)
  const { entries: localEntries } = useScheduleEntries();
  const cachedEntry = localEntries.find((entry) => entry.id === scheduleId);

  // 2. If not in cache, fetch directly via TRPC (online or deep link fallback)
  const {
    data: fetchedEntry,
    isLoading,
    isFetched,
    error,
  } = trpc.schedule.getById.useQuery(
    { id: scheduleId ?? '' },
    {
      enabled: !cachedEntry && !!scheduleId,
      staleTime: 1000 * 60 * 60, // 1 hour
    },
  );

  const entry = cachedEntry ?? (fetchedEntry as unknown as CampScheduleEntry | undefined);

  // Loading state (only when fetching and no cache)
  if (isLoading && !cachedEntry) {
    return (
      <ScheduleModalWrapper title="" isLoading>
        <ScheduleDetailSkeleton />
      </ScheduleModalWrapper>
    );
  }

  // Error or not found state
  // Only show error if we are relatively sure we are done loading
  if ((isFetched || error) && !entry) {
    return (
      <ScheduleModalWrapper title="Not Found">
        <div className="flex h-64 items-center justify-center text-gray-500">Entry not found.</div>
      </ScheduleModalWrapper>
    );
  }

  // Fallback for when data is still loading but we passed the isLoading check
  // This prevents "Not Found" from flickering during subtle state transitions
  if (!entry) {
    return (
      <ScheduleModalWrapper title="" isLoading>
        <ScheduleDetailSkeleton />
      </ScheduleModalWrapper>
    );
  }

  return (
    <ScheduleModalWrapper title={entry.title} rightAction={<DetailStarButton entryId={entry.id} />}>
      <ScheduleDetailContent entry={entry as CampScheduleEntry} locale={locale} />
    </ScheduleModalWrapper>
  );
};

export default ScheduleDetailModal;
