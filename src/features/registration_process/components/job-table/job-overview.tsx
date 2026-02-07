import type { Config as PayloadConfig } from '@/features/payload-cms/payload-types';
import { JobApprovalSection } from '@/features/registration_process/components/job-table/job-overview-components/job-approval-section';
import { JobOverviewError } from '@/features/registration_process/components/job-table/job-overview-components/job-error-analysis';
import { JobInputData } from '@/features/registration_process/components/job-table/job-overview-components/job-input-data';
import { JobMetadata } from '@/features/registration_process/components/job-table/job-overview-components/job-metadata';
import type { RegistrationJob } from '@/features/registration_process/components/job-table/types';
import React from 'react';

interface JobOverviewProperties {
  job: RegistrationJob;
  onResolve: (options: { resolvedUserId?: string; forceCreateUser?: boolean }) => Promise<void>;
  onReject: () => Promise<void>;
  isResolving: boolean;
  locale: PayloadConfig['locale'];
}

export const JobOverview: React.FC<JobOverviewProperties> = ({
  job,
  onResolve,
  onReject,
  isResolving,
  locale,
}) => {
  const rawInput = (job.input ?? {}) as Record<string, unknown>;
  const inputData = (rawInput['input'] as Record<string, unknown> | undefined) ?? rawInput;

  return (
    <div className="grid gap-6">
      <JobOverviewError job={job} />
      <JobApprovalSection
        job={job}
        onResolve={onResolve}
        onReject={onReject}
        isResolving={isResolving}
        locale={locale}
        inputData={inputData}
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <JobMetadata job={job} />
        <JobInputData inputData={inputData} />
      </div>
    </div>
  );
};
