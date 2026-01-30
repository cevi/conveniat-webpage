'use client';

import { SetDynamicPageTitle } from '@/components/header/set-dynamic-app-title';
import { ScheduleComponent } from '@/features/schedule/components/schedule-component';
import { ScheduleDetailView } from '@/features/schedule/components/schedule-detail-view';
import { useParams } from 'next/navigation';
import type React from 'react';

/**
 * Unified schedule page that handles both list and detail views.
 * - No id param: Shows schedule list
 * - With id param: Shows schedule details
 *
 * All data is fetched client-side via tRPC for offline support.
 */
const SchedulePage: React.FC = () => {
  const params = useParams();
  const idParameter = params['id'];

  // Extract ID from catch-all param (it's an array)
  const scheduleId = Array.isArray(idParameter) ? idParameter[0] : idParameter;

  // If we have an ID, show the detail view
  if (scheduleId) {
    return <ScheduleDetailView id={scheduleId} />;
  }

  // Otherwise show the schedule list
  return (
    <>
      <SetDynamicPageTitle newTitle="Programm" />
      <ScheduleComponent />
    </>
  );
};

export default SchedulePage;
