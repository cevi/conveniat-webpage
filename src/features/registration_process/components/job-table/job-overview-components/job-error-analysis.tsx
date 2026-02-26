import { JsonBlock } from '@/components/ui/json-block';
import type { RegistrationJob } from '@/features/registration_process/components/job-table/types';
import { toast } from '@/lib/toast';
import { trpc } from '@/trpc/client';
import { AlertCircle, Check, Copy, RefreshCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React from 'react';

interface JobOverviewErrorProperties {
  job: RegistrationJob;
}

export const JobOverviewError: React.FC<JobOverviewErrorProperties> = ({ job }) => {
  const [copiedError, setCopiedError] = React.useState(false);
  const router = useRouter();
  const utils = trpc.useUtils();
  const restartJobMutation = trpc.registration.restartFailedJob.useMutation();

  // Parse error if it exists and looks like the Zod/Validation error from the user's screenshot
  const errorObject = job.log?.find((l) => l.state === 'failed')?.error as
    | { message?: string | string[] }
    | undefined;

  const handleCopyError = (): void => {
    if (!errorObject) return;
    const textToCopy = JSON.stringify(errorObject, undefined, 2);
    void navigator.clipboard.writeText(textToCopy);
    setCopiedError(true);
    setTimeout(() => setCopiedError(false), 2000);
  };

  const handleRestart = async (): Promise<void> => {
    try {
      await restartJobMutation.mutateAsync({ jobId: String(job.id) });
      toast.success('Workflow restarted successfully');
      await utils.registration.getRecentJobs.invalidate();
      router.refresh();
    } catch (error) {
      console.error('Failed to restart workflow:', error);
      toast.error('Failed to restart workflow');
    }
  };

  let errorMessage: React.ReactNode;

  if (errorObject) {
    const rawMessage = Array.isArray(errorObject.message)
      ? errorObject.message.join('\n')
      : errorObject.message;

    if (typeof rawMessage === 'string') {
      let parsedData: unknown;
      try {
        // Try to extract JSON from the error message if it contains "Invalid input schema ... ["
        const jsonStart = rawMessage.indexOf('[');
        const jsonEnd = rawMessage.lastIndexOf(']');
        if (jsonStart !== -1 && jsonEnd !== -1) {
          const jsonString = rawMessage.slice(jsonStart, jsonEnd + 1);
          parsedData = JSON.parse(jsonString) as unknown;
        }
      } catch {
        // Fallback to raw message if parsing fails
      }

      errorMessage =
        parsedData !== undefined && parsedData !== null ? (
          <div className="mt-2 text-xs">
            <p className="mb-2 font-medium text-red-600 dark:text-red-400">
              Schema Validation Errors:
            </p>
            <div className="relative">
              <button
                onClick={handleCopyError}
                className="absolute top-2 right-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-red-200 bg-white/50 hover:bg-red-100 dark:border-red-900/30 dark:bg-black/20 dark:hover:bg-red-900/50"
                title="Copy JSON"
                type="button"
              >
                {copiedError ? (
                  <Check className="h-4 w-4 text-red-600 dark:text-red-400" />
                ) : (
                  <Copy className="h-4 w-4 text-red-600/70 dark:text-red-400/70" />
                )}
              </button>
              <JsonBlock
                data={parsedData}
                className="border-red-100 bg-red-50/50 break-all whitespace-pre-wrap text-red-700 dark:border-red-900/30 dark:bg-red-950/10 dark:text-red-300"
              />
            </div>
          </div>
        ) : (
          rawMessage
        );
    }
  }

  if (job.hasError !== true) {
    return <></>;
  }

  return (
    <div className="rounded-xl border border-red-100 bg-red-50/20 dark:border-red-900/30 dark:bg-red-900/10">
      <div className="flex items-center justify-between px-6 py-3 pb-2">
        <h3 className="flex items-center gap-2 text-sm font-bold text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4" />
          Error Analysis
        </h3>
        <button
          onClick={() => void handleRestart()}
          disabled={restartJobMutation.isPending}
          className="flex cursor-pointer items-center gap-1.5 rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 shadow-sm transition-colors hover:bg-red-50 focus:ring-2 focus:ring-red-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/40"
          type="button"
        >
          <RefreshCcw
            className={`h-3.5 w-3.5 ${restartJobMutation.isPending ? 'animate-spin' : ''}`}
          />
          {restartJobMutation.isPending ? 'Restarting...' : 'Restart Workflow'}
        </button>
      </div>
      <div className="px-6 pb-4 text-xs text-red-600 dark:text-red-300">
        {errorMessage ?? 'Unknown error occurred'}
      </div>
    </div>
  );
};
