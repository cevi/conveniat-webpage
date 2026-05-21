import { HeadlineH1 } from '@/components/ui/typography/headline-h1';
import type { Locale, StaticTranslationString } from '@/types/types';
import type React from 'react';

const appFeaturesTitle: StaticTranslationString = {
  en: 'conveniat27 App',
  de: 'conveniat27 App',
  fr: 'App conveniat27',
};

export const DashboardAppFeaturesSkeleton: React.FC<{ locale: Locale }> = ({ locale }) => {
  return (
    <div>
      <HeadlineH1 className="mb-4">{appFeaturesTitle[locale]}</HeadlineH1>
      <div className="overflow-x-auto pb-4">
        <div className="flex w-max gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-28 w-72 animate-pulse rounded-lg border border-gray-200 bg-gray-100 p-4"
            >
              <div className="flex h-full items-center gap-3">
                <div className="flex w-16 shrink-0 justify-center">
                  <div className="h-10 w-10 rounded-full bg-gray-200" />
                </div>
                <div className="w-2/3 flex-1 space-y-2">
                  <div className="h-4 w-2/3 rounded bg-gray-200" />
                  <div className="h-3 w-full rounded bg-gray-200" />
                  <div className="h-3 w-3/4 rounded bg-gray-200" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
