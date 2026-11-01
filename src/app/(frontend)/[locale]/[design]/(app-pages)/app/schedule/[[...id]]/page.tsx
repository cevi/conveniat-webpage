'use client';

import { SetDynamicPageTitle } from '@/components/header/set-dynamic-app-title';
import { ScheduleComponent } from '@/features/schedule/components/schedule-component';
import { ScheduleDetailView } from '@/features/schedule/components/schedule-detail-view';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import { useKeptScrollPosition } from '@/hooks/use-kept-scroll-position';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { useParams, useSearchParams } from 'next/navigation';
import type React from 'react';
import { Activity } from 'react';

// the same words as the tab that opens it
const pageTitle: StaticTranslationString = {
  de: 'Programm',
  en: 'Program',
  fr: 'Programme',
};

/**
 * Unified schedule page that handles both list and detail views.
 * - No id param: Shows schedule list
 * - With id param: Shows schedule details over the list, which stays mounted and hidden
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

  const hasId = scheduleId !== null && scheduleId !== '';
  useKeptScrollPosition(hasId);

  return (
    <>
      {/* hidden, not unmounted, under an open block: its search, its filters and its place
          survive the visit, the way Next.js keeps a page the user left */}
      <Activity mode={hasId ? 'hidden' : 'visible'}>
        <SetDynamicPageTitle newTitle={pageTitle[locale]} />
        <ScheduleComponent />
      </Activity>
      {hasId && <ScheduleDetailView id={scheduleId} />}
    </>
  );
};

export default SchedulePage;
