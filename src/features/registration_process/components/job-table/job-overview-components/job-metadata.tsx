import { DetailRow } from '@/features/registration_process/components/job-table/job-details-shared';
import type { RegistrationJob } from '@/features/registration_process/components/job-table/types';
import { cn } from '@/utils/tailwindcss-override';
import { Calendar, ChevronDown, Clock, Database, Hash, RotateCw } from 'lucide-react';
import React, { useState } from 'react';

interface JobMetadataProperties {
  job: RegistrationJob;
}

export const JobMetadata: React.FC<JobMetadataProperties> = ({ job }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-transparent dark:border-zinc-800">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full cursor-pointer items-center justify-between border-transparent bg-zinc-50/50 px-6 py-3 ring-0 transition-colors outline-none hover:bg-zinc-100/50 focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:outline-none dark:bg-zinc-900/30 dark:hover:bg-zinc-800/50"
      >
        <h3 className="text-xs font-bold tracking-wider text-zinc-500 uppercase">Metadata</h3>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-zinc-400 transition-transform duration-200',
            isExpanded && 'rotate-180',
          )}
        />
      </button>
      {isExpanded && (
        <div className="border-t border-zinc-100 p-4 dark:border-zinc-800">
          <DetailRow
            icon={Hash}
            label="Job ID"
            value={<span className="font-mono">{job.id}</span>}
          />
          <DetailRow icon={Database} label="Queue" value="default" />
          <DetailRow icon={RotateCw} label="Attempts" value={String(job.totalTried ?? 1)} />
          <DetailRow
            icon={Calendar}
            label="Created"
            value={new Date(job.createdAt).toLocaleString()}
          />
          {job.completedAt !== undefined && job.completedAt !== null && (
            <DetailRow
              icon={Clock}
              label="Completed"
              value={new Date(job.completedAt).toLocaleString()}
            />
          )}
        </div>
      )}
    </div>
  );
};
