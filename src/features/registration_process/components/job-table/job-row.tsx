import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { JobDetails } from '@/features/registration_process/components/job-table/job-details';
import { StepIndicator } from '@/features/registration_process/components/job-table/step-indicator';
import type {
  JobStatusFilter,
  RegistrationJob,
} from '@/features/registration_process/components/job-table/types';
import { STATUS_CONFIG } from '@/features/registration_process/components/job-table/types';
import { cn } from '@/utils/tailwindcss-override';
import { formatDistanceToNow } from 'date-fns';
import { Check, ChevronRight, Copy } from 'lucide-react';
import React from 'react';

// --- Helpers (Internal) ---
const copyToClipboard = (text: string): void => {
  void navigator.clipboard.writeText(text);
};

const JobStatusIndicator: React.FC<{ job: RegistrationJob }> = ({ job }) => {
  let status: JobStatusFilter = 'queued';

  const taskKeys = Object.keys(job.taskStatus ?? {});
  const lastTask = taskKeys.at(-1);
  const isCurrentlyBlocked = lastTask === 'blockJob';

  if (job.hasError === true) status = 'failed';
  else if (isCurrentlyBlocked) status = 'awaiting_approval';
  else if (job.completedAt !== undefined && job.completedAt !== null) status = 'completed';
  else if (job.processing === true) status = 'processing';
  else {
    const lastLog = job.log?.at(-1);
    // Only show retrying if it's currently marked as failed in logs BUT the job itself
    // hasn't officially flatlined (hasError is false)
    if (lastLog?.state === 'failed') status = 'retrying';
  }

  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-zinc-100">
      <Icon className={cn('h-3.5 w-3.5', config.color)} />
      <span>{config.label}</span>
    </div>
  );
};

interface JobRowProperties {
  job: RegistrationJob;
  isExpanded: boolean;
  onToggle: () => void;
}

export const JobRow: React.FC<JobRowProperties> = ({ job, isExpanded, onToggle }) => {
  const [copiedId, setCopiedId] = React.useState<boolean>(false);

  const handleCopy = (event: React.MouseEvent): void => {
    event.stopPropagation();
    copyToClipboard(job.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <React.Fragment>
      <tr
        className={cn(
          'group bg-white transition-colors hover:bg-zinc-50 dark:bg-transparent dark:hover:bg-white/2',
          isExpanded && 'bg-zinc-50 dark:bg-white/2',
        )}
        onClick={onToggle}
      >
        <td className="border-b border-zinc-50 px-4 py-4 align-top whitespace-nowrap dark:border-zinc-800/50">
          {/* ID Column */}
          <div className="flex items-center gap-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-help rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    {job.id.slice(0, 6)}...{job.id.slice(-5)}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-mono text-xs">{job.id}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <button
              onClick={handleCopy}
              className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md border-none bg-transparent opacity-0 ring-0 transition-all outline-none group-hover:opacity-100 hover:bg-zinc-200 focus:ring-0 focus:outline-none dark:hover:bg-white/10"
              title="Copy ID"
            >
              {copiedId ? (
                <Check className="h-3 w-3 text-emerald-500" />
              ) : (
                <Copy className="h-3 w-3 text-zinc-400 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-300" />
              )}
            </button>
          </div>
        </td>

        <td className="border-b border-zinc-50 px-4 py-4 align-top dark:border-zinc-800/50">
          <StepIndicator job={job} />
        </td>

        <td className="border-b border-zinc-50 px-4 py-4 text-right align-top dark:border-zinc-800/50">
          <div className="flex justify-end">
            <JobStatusIndicator job={job} />
          </div>
        </td>

        <td className="border-b border-zinc-50 px-4 py-4 text-right align-top whitespace-nowrap dark:border-zinc-800/50">
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
              {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
            </span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-default text-[10px] text-zinc-400">
                    {new Date(job.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="left">
                  {new Date(job.createdAt).toLocaleString()}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </td>

        <td className="border-b border-zinc-50 px-4 py-4 text-right align-top whitespace-nowrap dark:border-zinc-800/50">
          <div className="flex justify-end">
            <button
              onClick={(event) => {
                event.stopPropagation();
                onToggle();
              }}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-zinc-400 ring-0 transition-colors outline-none hover:bg-zinc-100 hover:text-zinc-900 focus:ring-0 focus:outline-none dark:hover:bg-white/5 dark:hover:text-zinc-100"
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              <ChevronRight
                className={cn('h-4 w-4 transition-transform', {
                  'rotate-90': isExpanded,
                })}
              />
            </button>
          </div>
        </td>
      </tr>

      {isExpanded && (
        <tr className="bg-zinc-50/50 dark:bg-white/5">
          <td colSpan={5} className="px-0 py-0">
            <div className="max-h-[70vh] overflow-y-auto bg-white dark:bg-zinc-950">
              <JobDetails job={job} />
            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  );
};
