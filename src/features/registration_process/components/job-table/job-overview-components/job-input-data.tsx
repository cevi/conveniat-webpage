import {
  DetailRow,
  flattenObject,
  renderValue,
} from '@/features/registration_process/components/job-table/job-details-shared';
import { cn } from '@/utils/tailwindcss-override';
import { ChevronDown } from 'lucide-react';
import React, { useState } from 'react';

interface JobInputDataProperties {
  inputData: Record<string, unknown>;
}

export const JobInputData: React.FC<JobInputDataProperties> = ({ inputData }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-transparent dark:border-zinc-800">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full cursor-pointer items-center justify-between border-transparent bg-zinc-50/50 px-6 py-3 ring-0 transition-colors outline-none hover:bg-zinc-100/50 focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:outline-none dark:bg-zinc-900/30 dark:hover:bg-zinc-800/50"
      >
        <h3 className="text-xs font-bold tracking-wider text-zinc-500 uppercase">Input Data</h3>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-zinc-400 transition-transform duration-200',
            isExpanded && 'rotate-180',
          )}
        />
      </button>
      {isExpanded && (
        <div className="border-t border-zinc-100 p-4 dark:border-zinc-800">
          {Object.entries(flattenObject(inputData)).map(([key, value]) => (
            <DetailRow
              key={key}
              label={key}
              value={<span className="wrap-break-word">{renderValue(value)}</span>}
            />
          ))}
        </div>
      )}
    </div>
  );
};
