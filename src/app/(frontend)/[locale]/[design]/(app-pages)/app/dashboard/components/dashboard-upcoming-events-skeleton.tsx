import { Card } from '@/components/ui/card';
import type { Locale, StaticTranslationString } from '@/types/types';
import type React from 'react';

const upcomingProgramElementsTitle: StaticTranslationString = {
  en: 'My Program Today',
  de: 'Programm von heute',
  fr: "Programme d'aujourd'hui",
};

export const DashboardUpcomingEventsSkeleton: React.FC<{ locale: Locale }> = ({ locale }) => {
  return (
    <Card
      title={upcomingProgramElementsTitle[locale]}
      showBorder={false}
      contentClassName="p-6 pt-0"
    >
      <div className="space-y-3">
        {/* Skeleton Card 1 */}
        <div className="animate-pulse rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-2 h-4 w-1/3 rounded bg-gray-200" />
          <div className="h-4 w-2/3 rounded bg-gray-200" />
        </div>
        {/* Skeleton Card 2 */}
        <div className="animate-pulse rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-2 h-4 w-1/3 rounded bg-gray-200" />
          <div className="h-4 w-2/3 rounded bg-gray-200" />
        </div>
        {/* Skeleton Card 3 */}
        <div className="animate-pulse rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-2 h-4 w-1/3 rounded bg-gray-200" />
          <div className="h-4 w-2/3 rounded bg-gray-200" />
        </div>
      </div>
    </Card>
  );
};
