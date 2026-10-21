import { SectionLabel } from '@/components/ui/section-label';
import type { Locale, StaticTranslationString } from '@/types/types';
import type React from 'react';

const upcomingProgramElementsTitle: StaticTranslationString = {
  en: 'My Program Today',
  de: 'Programm von heute',
  fr: "Programme d'aujourd'hui",
};

/** "Programm von heute" before the first schedule entries arrive: three placeholder rows. */
export const DashboardUpcomingEventsSkeleton: React.FC<{ locale: Locale }> = ({ locale }) => {
  return (
    <section className="space-y-2">
      <SectionLabel>{upcomingProgramElementsTitle[locale]}</SectionLabel>
      <ul
        className="border-line divide-line divide-y rounded-[14px] border bg-white"
        aria-hidden="true"
      >
        {Array.from({ length: 3 }).map((_, index) => (
          <li key={index} className="flex gap-3 px-3.5 py-3">
            <div className="bg-chip h-4 w-12 animate-pulse rounded" />
            <div className="flex-1 space-y-2">
              <div className="bg-quiet h-3 w-1/4 animate-pulse rounded" />
              <div className="bg-chip h-4 w-2/3 animate-pulse rounded" />
              <div className="bg-quiet h-3 w-1/2 animate-pulse rounded" />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};
