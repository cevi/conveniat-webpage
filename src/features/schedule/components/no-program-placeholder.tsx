'use client';

import { Calendar } from 'lucide-react';
import type React from 'react';

interface NoProgramPlaceholderProperties {
  currentDate: Date;
}

export const NoProgramPlaceholder: React.FC<NoProgramPlaceholderProperties> = ({ currentDate }) => {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 py-12 text-center">
      <Calendar className="mb-4 h-12 w-12 text-gray-400" />
      <h3 className="mb-2 text-lg font-medium text-gray-900">No Program Available</h3>
      <p className="text-gray-600">
        There are no scheduled events for{' '}
        {currentDate.toLocaleDateString('de-CH', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        })}
        .
      </p>
      <p className="mt-2 text-sm text-gray-500">
        Please check other dates for scheduled activities.
      </p>
    </div>
  );
};
