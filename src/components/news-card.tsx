import { LOCALE } from '@/features/payload-cms/payload-cms/locales';
import type { ReactNode } from 'react';
import React from 'react';

export const NewsCard: React.FC<{
  children: ReactNode;
  date: string;
  headline: string;
}> = ({ children, date, headline }) => {
  return (
    <div className="flex max-h-96 basis-1 flex-col border-2 border-gray-200 bg-white hover:shadow-md transition duration-200 rounded-md p-6 lg:max-w-96">
      <div>
        <span className="font-body text-[12px] font-bold text-gray-500">
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
        <h4 className="mb-6 font-heading text-base font-extrabold text-conveniat-green text-ellipsis line-clamp-3 min-h-[4.5rem]">
          {headline}
        </h4>
      </div>
      <div className="flex-grow overflow-hidden">{children}</div>
    </div>
  );
};
