import { DashboardUpcomingEvents } from '@/app/(frontend)/[locale]/[design]/(app-pages)/app/dashboard/components/dashboard-upcoming-events';
import { getScheduleEntriesForDashboard } from '@/features/schedule/api/get-schedule-entries';
import type { Locale } from '@/types/types';
import type React from 'react';

export const DashboardUpcomingEventsWrapper: React.FC<{ locale: Locale }> = async ({ locale }) => {
  const scheduleEvents = await getScheduleEntriesForDashboard(locale);

  return <DashboardUpcomingEvents locale={locale} scheduleEvents={scheduleEvents} />;
};
