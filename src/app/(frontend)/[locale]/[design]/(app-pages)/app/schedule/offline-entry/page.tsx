import { ScheduleDetailPageContent } from '@/features/schedule/components/schedule-detail-page-content';
import { ForceDynamicOnBuild } from '@/utils/is-pre-rendering';
import type React from 'react';

/**
 * Static "App Shell" page for offline schedule entries.
 *
 * This page is served by the Service Worker when a user navigates to
 * `/app/schedule/[id]` while offline or when the network fails.
 *
 * It renders the `ScheduleDetailPageContent` client component, which:
 * 1. Reads the ID from the URL hash or path (via useParams)
 * 2. Fetches data from the local TanStack Query cache (hydrated by the list view)
 */
const OfflineScheduleEntryPage: React.FC = () => {
  return (
    <ForceDynamicOnBuild>
      <ScheduleDetailPageContent />
    </ForceDynamicOnBuild>
  );
};

export default OfflineScheduleEntryPage;
