'use client';

import { HofShiftsView } from '@/features/schedule/components/hof-shifts-view';
import { ShiftDetailView } from '@/features/schedule/components/shift-detail-view';
import { ShiftsComponent } from '@/features/schedule/components/shifts-component';
import {
  HOF_VIEW_PARAMETER,
  HOF_VIEW_VALUE,
  ShiftsViewSwitch,
} from '@/features/schedule/components/shifts-view-switch';
import type { Locale } from '@/types/types';
import { useSearchParams } from 'next/navigation';
import type React from 'react';

/**
 * The helper portal: the feed, or one shift in full.
 *
 * Which of the two is decided by `?id=` rather than by state held in a card, mirroring the
 * programme page. The switch lives here rather than inside `ShiftsComponent` because that
 * component runs a dozen hooks before it could return, and a conditional return above them is
 * not something a component is allowed to do.
 */
export const ShiftsPageContent: React.FC<{ locale: Locale }> = ({ locale }) => {
  const searchParameters = useSearchParams();
  const shiftId = searchParameters.get('id');

  if (shiftId !== null && shiftId !== '') {
    return <ShiftDetailView shiftId={shiftId} locale={locale} />;
  }

  // the AVP of a Hof switches between the shifts of a day and what their Hof stands at
  const isHofView = searchParameters.get(HOF_VIEW_PARAMETER) === HOF_VIEW_VALUE;
  return (
    <>
      <ShiftsViewSwitch locale={locale} />
      {isHofView ? <HofShiftsView locale={locale} /> : <ShiftsComponent locale={locale} />}
    </>
  );
};
