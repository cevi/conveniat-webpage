import {
  DetailRow,
  ExpandableSection,
} from '@/features/registration_process/components/job-table/job-details-shared';
import type { RegistrationJob } from '@/features/registration_process/components/job-table/types';
import { Calendar, Clock, Database, Hash, RotateCw } from 'lucide-react';
import React from 'react';

interface JobMetadataProperties {
  job: RegistrationJob;
}

export const JobMetadata: React.FC<JobMetadataProperties> = ({ job }) => {
  return (
    <ExpandableSection title="Metadata">
      <DetailRow icon={Hash} label="Job ID" value={<span className="font-mono">{job.id}</span>} />
      <DetailRow icon={Database} label="Queue" value={job.queue ?? 'default'} />
      <DetailRow icon={RotateCw} label="Attempts" value={String(job.totalTried ?? 1)} />
      <DetailRow icon={Calendar} label="Created" value={new Date(job.createdAt).toLocaleString()} />
      {job.completedAt !== undefined && job.completedAt !== null && (
        <DetailRow
          icon={Clock}
          label="Completed"
          value={new Date(job.completedAt).toLocaleString()}
        />
      )}
    </ExpandableSection>
  );
};
