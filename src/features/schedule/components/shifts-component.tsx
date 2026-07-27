'use client';

import { DateCarouselViewWrapper } from '@/features/schedule/components/date-carousel-view-wrapper';
import { ScheduleLoadingSkeleton } from '@/features/schedule/components/schedule-loading-skeleton';
import { ShiftCard } from '@/features/schedule/components/shift-card';
import { ShiftMainContent } from '@/features/schedule/components/shift-main-content';
import { useSchedule } from '@/features/schedule/hooks/use-schedule';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import React from 'react';

const noShiftsText: StaticTranslationString = {
  en: 'No helper shifts available for this date.',
  de: 'Noch keine Schichteinsätze für dieses Datum verfügbar.',
  fr: 'Aucun service disponible pour cette date.',
};

function hasShiftMainContent(mainContent?: unknown): boolean {
  if (!Array.isArray(mainContent) || mainContent.length === 0) {
    return false;
  }

  return mainContent.some((block) => {
    if (block === null || block === undefined || typeof block !== 'object') {
      return false;
    }
    const b = block as Record<string, unknown>;

    if (b['blockType'] === 'richTextSection') {
      const section =
        typeof b['richTextSection'] === 'object' && b['richTextSection'] !== null
          ? (b['richTextSection'] as Record<string, unknown>)
          : undefined;
      const root =
        typeof section?.['root'] === 'object' && section['root'] !== null
          ? (section['root'] as Record<string, unknown>)
          : undefined;
      if (root === undefined) {
        return false;
      }

      const hasTextNode = (node: unknown): boolean => {
        if (node === null || node === undefined || typeof node !== 'object') {
          return false;
        }
        const n = node as Record<string, unknown>;
        if (typeof n['text'] === 'string' && n['text'].trim().length > 0) {
          return true;
        }
        if (Array.isArray(n['children'])) {
          return n['children'].some((childItem) => hasTextNode(childItem));
        }
        return false;
      };

      return hasTextNode(root);
    }

    return true;
  });
}

/**
 * Client Component for the /app/helper-portal page.
 * Displays date selector carousel and helper shifts filtered by selected date.
 */
export const ShiftsComponent: React.FC<{ locale: Locale }> = ({ locale }) => {
  const { data: shifts, isLoading } = trpc.schedule.getHelperShifts.useQuery(undefined, {
    staleTime: 1000 * 60 * 10, // 10 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const {
    currentDate,
    allDates,
    currentProgram: currentShifts,
    carouselStartIndex,
    maxVisibleDays,
    actions,
  } = useSchedule(shifts ?? []);

  const hasShifts = currentShifts.length > 0;

  if (isLoading) {
    return <ScheduleLoadingSkeleton />;
  }

  return (
    <DateCarouselViewWrapper
      allDates={allDates}
      currentDate={currentDate}
      carouselStartIndex={carouselStartIndex}
      maxVisibleDays={maxVisibleDays}
      locale={locale}
      onDateSelect={actions.handleDateSelect}
      onCarouselPrevious={actions.handleCarouselPrevious}
      onCarouselNext={actions.handleCarouselNext}
    >
      {hasShifts ? (
        <div className="space-y-3">
          {currentShifts.map((shift) => {
            const hasMainContent = hasShiftMainContent(shift.mainContent);

            return (
              <ShiftCard key={shift.id} shift={shift} locale={locale}>
                {hasMainContent && (
                  <ShiftMainContent blocks={shift.mainContent as unknown[]} locale={locale} />
                )}
              </ShiftCard>
            );
          })}
        </div>
      ) : (
        <div className="py-12 text-center text-sm text-gray-400">{noShiftsText[locale]}</div>
      )}
    </DateCarouselViewWrapper>
  );
};
