import {
  DetailRow,
  flattenObject,
  renderValue,
} from '@/features/registration_process/components/job-table/job-details-shared';
import React from 'react';

interface JobInputDataProperties {
  inputData: Record<string, unknown>;
}

export const JobInputData: React.FC<JobInputDataProperties> = ({ inputData }) => {
  return (
    <div className="rounded-xl border border-zinc-200 bg-transparent dark:border-zinc-800">
      <div className="border-b border-zinc-100 bg-zinc-50/50 px-6 py-3 dark:border-zinc-800 dark:bg-zinc-900/30">
        <h3 className="text-xs font-bold tracking-wider text-zinc-500 uppercase">Input Data</h3>
      </div>
      <div className="p-4">
        {Object.entries(flattenObject(inputData)).map(([key, value]) => (
          <DetailRow
            key={key}
            label={key}
            value={<span className="wrap-break-word">{renderValue(value)}</span>}
          />
        ))}
      </div>
    </div>
  );
};
