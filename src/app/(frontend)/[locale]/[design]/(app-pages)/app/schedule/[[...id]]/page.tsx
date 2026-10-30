'use client';

import { SetDynamicPageTitle } from '@/components/header/set-dynamic-app-title';
import { ScheduleComponent } from '@/features/schedule/components/schedule-component';
import { ScheduleDetailView } from '@/features/schedule/components/schedule-detail-view';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { useParams, useSearchParams } from 'next/navigation';
import type React from 'react';

// the same words as the tab that opens it
const pageTitle: StaticTranslationString = {
  de: 'Programm',
  en: 'Program',
  fr: 'Programme',
};

/**
 * Unified schedule page that handles both list and detail views.
 * - No id param: Shows schedule list
 * - With id param: Shows schedule details
 *
 * All data is fetched client-side via tRPC for offline support.
 */
const SchedulePage: React.FC = () => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const params = useParams();
  const searchParameters = useSearchParams();
  const idParameter = params['id'];

  // Extract ID from catch-all param (it's an array) or from query param
  const scheduleId =
    (Array.isArray(idParameter) ? idParameter[0] : idParameter) ?? searchParameters.get('id');

  // If we have an ID, show the detail view
  if (scheduleId) {
    return <ScheduleDetailView id={scheduleId} />;
  }

  // Otherwise show the schedule list
  return (
    <>
      <SetDynamicPageTitle newTitle={pageTitle[locale]} />
      <ScheduleComponent />
    </>
  );
};

export default SchedulePage;
