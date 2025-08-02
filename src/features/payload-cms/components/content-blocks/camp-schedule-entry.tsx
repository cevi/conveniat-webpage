import type { CampMapAnnotation } from '@/features/payload-cms/payload-types';
import { getScheduleEntries } from '@/features/schedule/components/schedule-component-server';
import React from 'react';

export interface CampScheduleEntryType {
  date: string;
  location?: CampMapAnnotation | undefined;
}

const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0] ?? '';
};

export const CampScheduleEntryContentBlock: React.FC<CampScheduleEntryType> = async ({
  ...block
}) => {
  const { date, location } = block;

  const scheduleEntries = await getScheduleEntries(
    location ? { location: { equals: location.id } } : {},
  );

  const showDate = formatDate(new Date(date));

  return (
    <div className="bg-conveniat-green/10">
      <h3>
        {showDate}
        {location ? <> - {location.title}</> : <></>}
      </h3>
      {scheduleEntries?.map((entry) => {
        return (
          <>
            <p key={entry.id}>{entry.title}</p>
          </>
        );
      })}
    </div>
  );
};
