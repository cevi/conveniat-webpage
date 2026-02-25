import { SafeErrorBoundary } from '@/components/error-boundary/safe-error-boundary';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/buttons/button';
import type { Config as PayloadConfig } from '@/features/payload-cms/payload-types';
import { JobOverview } from '@/features/registration_process/components/job-table/job-overview';
import { JobTimeline } from '@/features/registration_process/components/job-table/job-timeline';
import { StepDetails } from '@/features/registration_process/components/job-table/step-details';
import type { RegistrationJob } from '@/features/registration_process/components/job-table/types';
import { STEP_MAPPING } from '@/features/registration_process/components/job-table/types';
import { toast } from '@/lib/toast';
import { trpc } from '@/trpc/client';
import { useLocale } from '@payloadcms/ui';
import { useRouter } from 'next/navigation';
import React from 'react';

interface JobDetailsProperties {
  job: RegistrationJob;
}

export const JobDetails: React.FC<JobDetailsProperties> = ({ job }) => {
  const [selectedStepIndex, setSelectedStepIndex] = React.useState<number>(-1);

  const [isResolving, setIsResolving] = React.useState(false);
  const { code: locale } = useLocale() as { code: PayloadConfig['locale'] };
  const resolveJobMutation = trpc.registration.resolveBlockedJob.useMutation();
  const rejectJobMutation = trpc.registration.rejectBlockedJob.useMutation();
  const utils = trpc.useUtils();
  const router = useRouter();

  // Extract selected step data
  const logs = job.log ?? [];
  const selectedStep = logs[selectedStepIndex];

  const handleResolve = async (
    options: { resolvedUserId?: string; forceCreateUser?: boolean } = {},
  ): Promise<void> => {
    if (job.blockedJobId === undefined) return;
    setIsResolving(true);
    try {
      await resolveJobMutation.mutateAsync({
        jobId: String(job.blockedJobId),
        resolutionData: options,
      });
      toast.success(
        options.forceCreateUser === true ? 'User creation queued' : 'Resolution confirmed',
      );
      await utils.registration.getRecentJobs.invalidate();
      router.refresh();
    } catch (error) {
      console.error('Resolution failed:', error);
      toast.error('Failed to resolve');
    } finally {
      setIsResolving(false);
    }
  };

  const handleReject = async (): Promise<void> => {
    if (job.blockedJobId === undefined) return;
    setIsResolving(true);
    try {
      await rejectJobMutation.mutateAsync({
        jobId: String(job.blockedJobId),
      });
      toast.success('Job rejected');
      await utils.registration.getRecentJobs.invalidate();
      router.refresh();
    } catch (error) {
      console.error('Rejection failed:', error);
      toast.error('Failed to reject');
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 divide-x divide-zinc-100 lg:grid-cols-[320px_1fr] dark:divide-zinc-800">
      {/* Left Column: Timeline */}
      <div className="bg-zinc-50/50 p-6 dark:bg-zinc-900/20">
        <h3 className="mb-4 text-xs font-bold tracking-wider text-zinc-500 uppercase">
          Process Timeline
        </h3>
        <JobTimeline
          job={job}
          selectedStepIndex={selectedStepIndex}
          onSelectStep={setSelectedStepIndex}
        />
      </div>

      {/* Right Column: Details */}
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              {selectedStep
                ? (STEP_MAPPING[selectedStep.taskSlug]?.label ?? `Step: ${selectedStep.taskSlug}`)
                : 'Job Details'}
            </h3>
            {selectedStep && (
              <Button variant="outline" size="sm" onClick={() => setSelectedStepIndex(-1)}>
                Back to Overview
              </Button>
            )}
          </div>
          <Badge
            variant={((): 'destructive' | 'outline' | 'default' => {
              if (job.hasError === true) return 'destructive';
              if (job.completedAt !== undefined && job.completedAt !== null) return 'default';
              return 'outline';
            })()}
            className="text-[10px] tracking-wider uppercase"
          >
            {((): string => {
              const taskKeys = Object.keys(job.taskStatus ?? {});
              const lastTask = taskKeys.at(-1);
              const isCurrentlyBlocked = lastTask === 'blockJob';

              if (job.hasError === true) return 'Failed';
              if (isCurrentlyBlocked) return 'Await Approval';
              if (job.completedAt !== undefined && job.completedAt !== null) return 'Completed';
              if (job.processing === true) return 'Processing';

              // If last log entry was a failure, but job itself is not failed, it's retrying
              const lastLog = job.log?.at(-1);
              if (lastLog?.state === 'failed') return 'Retrying';

              return 'Queued';
            })()}
          </Badge>
        </div>

        {selectedStep ? (
          <SafeErrorBoundary
            fallback={
              <div className="rounded-md border border-red-100 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-400">
                <p className="font-bold">Something went wrong showing this step.</p>
                <p className="mt-1 text-xs opacity-80">Please check the logs for details.</p>
              </div>
            }
          >
            <StepDetails step={selectedStep} />
          </SafeErrorBoundary>
        ) : (
          <JobOverview
            job={job}
            onResolve={handleResolve}
            onReject={handleReject}
            isResolving={isResolving}
            locale={locale}
          />
        )}
      </div>
    </div>
  );
};
