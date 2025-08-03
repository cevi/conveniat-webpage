'use client';

import { HeadlineH1 } from '@/components/ui/typography/headline-h1';
import type React from 'react';

interface ScheduleHeaderProperties {
  currentDate: Date;
}

export const ScheduleHeader: React.FC<ScheduleHeaderProperties> = ({ currentDate }) => {
  return (
    <div className="mb-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex-1 text-center">
          <HeadlineH1 className="mb-2">
            {currentDate.toLocaleDateString('de-CH', {
              weekday: 'long',
              month: 'numeric',
              day: 'numeric',
            })}
          </HeadlineH1>
        </div>
      </div>
    </div>
  );
};
