import { PageSectionsConverter } from '@/features/payload-cms/converters/page-sections';
import type { ContentBlock } from '@/features/payload-cms/converters/page-sections/section-wrapper';
import type { HelperShiftFrontendType } from '@/features/schedule/api/get-helper-shifts';
import { getHelperShifts } from '@/features/schedule/api/get-helper-shifts';
import { ShiftCard } from '@/features/schedule/components/shift-card';
import type { Locale, StaticTranslationString } from '@/types/types';
import React from 'react';

const noShiftsText: StaticTranslationString = {
  en: 'No helper shifts available yet.',
  de: 'Noch keine Schichteinsätze verfügbar.',
  fr: 'Aucun service disponible pour le moment.',
};

const pageTitle: StaticTranslationString = {
  en: 'Helper Shifts',
  de: 'Schichteinsätze',
  fr: 'Services de helpers',
};

/**
 * Groups helper shifts by date for display.
 */
function groupByDate(
  shifts: HelperShiftFrontendType[],
): { date: string; shifts: HelperShiftFrontendType[] }[] {
  const dateMap = new Map<string, HelperShiftFrontendType[]>();

  for (const shift of shifts) {
    const dateKey = shift.timeslot.date.split('T')[0] ?? shift.timeslot.date;
    const existing = dateMap.get(dateKey) ?? [];
    existing.push(shift);
    dateMap.set(dateKey, existing);
  }

  return [...dateMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, groupShifts]) => ({ date, shifts: groupShifts }));
}

/**
 * Main Server Component for the /app/helper-portal page.
 * Fetches helper shifts directly and groups them by date.
 */
export const ShiftsComponent: React.FC<{ locale: Locale }> = async ({ locale }) => {
  const shifts = await getHelperShifts({}, locale);
  const grouped = groupByDate(shifts);

  return (
    <article className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">{pageTitle[locale]}</h1>

      {grouped.length === 0 && (
        <p className="text-center text-sm text-gray-400">{noShiftsText[locale]}</p>
      )}

      <div className="space-y-8">
        {grouped.map(({ date, shifts: dayShifts }) => (
          <section key={date}>
            <h2 className="mb-3 text-sm font-semibold tracking-wide text-gray-400 uppercase">
              {new Date(date).toLocaleDateString(locale, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </h2>
            <div className="space-y-3">
              {dayShifts.map((shift) => {
                const hasMainContent =
                  Array.isArray(shift.mainContent) && shift.mainContent.length > 0;

                return (
                  <ShiftCard key={shift.id} shift={shift} locale={locale}>
                    {hasMainContent && (
                      <PageSectionsConverter
                        blocks={shift.mainContent as ContentBlock[]}
                        locale={locale}
                      />
                    )}
                  </ShiftCard>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
};
