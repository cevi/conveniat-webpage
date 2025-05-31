import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';
import type { ReactNode } from 'react';
import React from 'react';

export const NewsCard: React.FC<{
  children: ReactNode;
  date: string;
  headline: string;
}> = async ({ children, date, headline }) => {
  const locale = await getLocaleFromCookies();

  return (
    <div className="flex max-h-96 basis-1 flex-col rounded-md border-2 border-gray-200 bg-white p-6 transition duration-200 hover:shadow-md lg:max-w-96">
      <div>
        <span className="font-body text-[12px] font-bold text-gray-500">
          {new Date(date).toLocaleDateString(locale, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            timeZone: 'Europe/Zurich',
          })}
        </span>
        <h4 className="font-heading text-conveniat-green mb-6 line-clamp-3 min-h-[4.5rem] text-base font-extrabold text-ellipsis">
          {headline}
        </h4>
      </div>
      <div className="grow overflow-hidden">{children}</div>
    </div>
  );
};
