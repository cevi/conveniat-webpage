import { CeviLogoGreen } from '@/components/svg-logos/cevi-logo-green';
import { LOCALE } from '@/features/payload-cms/payload-cms/locales';
import type { ReactNode } from 'react';
import React from 'react';

export const NewsCard: React.FC<{
  children: ReactNode;
  date: string;
  headline: string;
}> = ({ children, date, headline }) => {
  return (
    <div className="my-8 flex max-h-96 basis-1 flex-col rounded-2xl border-2 border-gray-200 bg-white p-6 text-center lg:max-w-96">
      <div>
        <CeviLogoGreen className="mx-auto my-2 flex w-full" />
        <span className="font-body text-xs font-bold text-gray-500">
          {new Date(date).toLocaleDateString(LOCALE.DE, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            timeZone: 'Europe/Zurich',
          })}
        </span>
        <h4 className="mb-6 font-heading text-base font-extrabold text-conveniat-green">
          {headline}
        </h4>
      </div>
      <div className="flex-grow overflow-hidden">{children}</div>
    </div>
  );
};
