'use client';

import { ShiftDetailView } from '@/features/schedule/components/shift-detail-view';
import { ShiftsComponent } from '@/features/schedule/components/shifts-component';
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
  const shiftId = useSearchParams().get('id');

  if (shiftId !== null && shiftId !== '') {
    return <ShiftDetailView shiftId={shiftId} locale={locale} />;
  }

  return <ShiftsComponent locale={locale} />;
};
