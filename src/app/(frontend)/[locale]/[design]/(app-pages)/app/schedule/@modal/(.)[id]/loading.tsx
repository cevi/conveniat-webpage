'use client';

import { ScheduleDetailSkeleton } from '@/features/schedule/components/schedule-detail-skeleton';
import { ScheduleModalWrapper } from '@/features/schedule/components/schedule-modal-wrapper';

export default function Loading(): React.ReactNode {
  return (
    <ScheduleModalWrapper title="" isLoading>
      <ScheduleDetailSkeleton />
    </ScheduleModalWrapper>
  );
}
