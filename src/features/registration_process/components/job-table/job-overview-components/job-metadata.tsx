import { DetailRow } from '@/features/registration_process/components/job-table/job-details-shared';
import type { RegistrationJob } from '@/features/registration_process/components/job-table/types';
import { Calendar, Clock, Database, Hash, RotateCw } from 'lucide-react';
import React from 'react';

interface JobMetadataProperties {
  job: RegistrationJob;
}

export const JobMetadata: React.FC<JobMetadataProperties> = ({ job }) => {
  return (
    <div className="rounded-xl border border-zinc-200 bg-transparent dark:border-zinc-800">
      <div className="border-b border-zinc-100 bg-zinc-50/50 px-6 py-3 dark:border-zinc-800 dark:bg-zinc-900/30">
        <h3 className="text-xs font-bold tracking-wider text-zinc-500 uppercase">Metadata</h3>
      </div>
      <div className="p-4">
        <DetailRow icon={Hash} label="Job ID" value={<span className="font-mono">{job.id}</span>} />
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
    </div>
  );
};
