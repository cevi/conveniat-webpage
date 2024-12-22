import React, { ReactNode } from 'react';
import { CeviLogoGreen } from '@/components/svg-logos/cevi-logo-green';

export const NewsCard: React.FC<{
  children: ReactNode;
  date: string;
  headline: string;
}> = ({ children, date, headline }) => {
  return (
    <div className="-mx-[8px] my-[32px] flex flex-col rounded-[16px] border border-gray-200 bg-green-100 p-[24px] text-center">
      <CeviLogoGreen className="mx-auto my-[8px] flex w-full" />

      <span className="font-body text-[10px] font-bold leading-[20px] text-gray-500">
        {new Date(date).toLocaleDateString('de', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          timeZone: 'Europe/Zurich',
        })}
      </span>
      <h4 className="mb-[16px] font-heading text-[16px] font-extrabold leading-[22px] text-conveniat-green">
        {headline}
      </h4>
      {children}
    </div>
  );
};
