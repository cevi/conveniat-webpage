import { Badge } from '@/components/ui/badge';
import type { RegistrationJob } from '@/features/registration_process/components/job-table/types';
import { STEP_MAPPING } from '@/features/registration_process/components/job-table/types';
import { cn } from '@/utils/tailwindcss-override';
import { formatDistanceToNow } from 'date-fns';
import { Check, Clock, X } from 'lucide-react';
import React from 'react';

export interface JobTimelineProperties {
  job: RegistrationJob;
  selectedStepIndex: number;
  onSelectStep: (index: number) => void;
}

export const JobTimeline: React.FC<JobTimelineProperties> = ({
  job,
  selectedStepIndex,
  onSelectStep,
}) => {
  // Use log if available, otherwise fallback to taskStatus keys?
  // The log array contains the history. taskStatus contains current state of each.
  // Ideally we use logs for a timeline.
  const logs = job.log ?? [];

  if (logs.length === 0) {
    return <div className="p-4 text-xs text-zinc-400">No logs available for timeline.</div>;
  }

  return (
    <div className="relative flex flex-col gap-6 pl-2">
      {/* Connector Line */}
      <div className="absolute top-2 bottom-2 left-[19px] w-px bg-zinc-200 dark:bg-zinc-800" />

      {logs.map((logEntry, index) => {
        const isError = logEntry.error !== undefined || logEntry.state === 'failed';
        const isCompleted = logEntry.completedAt !== undefined || logEntry.state === 'completed';
        const isSelected = selectedStepIndex === index;
        const mapping = STEP_MAPPING[logEntry.taskSlug];
        const label = mapping?.label ?? logEntry.taskSlug;

        let iconClasses = 'border-zinc-100 text-zinc-400 dark:border-zinc-800';
        let textClasses = 'text-zinc-500';

        if (isError) {
          iconClasses = 'border-red-100 text-red-500 dark:border-red-900/30';
          textClasses = 'text-red-600';
        } else if (isCompleted) {
          iconClasses = 'border-emerald-100 text-emerald-500 dark:border-emerald-900/30';
          textClasses = 'text-zinc-900 dark:text-zinc-100';
        }

        return (
          <div
            key={index}
            className={cn(
              'relative z-10 -ml-2 flex cursor-pointer gap-4 rounded-lg px-2 py-0.5 transition-colors',
              isSelected
                ? 'bg-zinc-100 dark:bg-zinc-800'
                : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/50',
            )}
            onClick={() => onSelectStep(index)}
          >
            {/* Icon */}
            <div
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 bg-white transition-colors dark:bg-zinc-950',
                iconClasses,
              )}
            >
              {isError && <X className="h-5 w-5" />}
              {!isError && isCompleted && <Check className="h-5 w-5" />}
              {!isError && !isCompleted && <Clock className="h-5 w-5" />}
            </div>

            {/* Content */}
            <div className="flex flex-col pt-1">
              <div className="flex items-center gap-2">
                <span className={cn('text-sm font-bold', textClasses)}>{label}</span>
                {logEntry.completedAt !== undefined && (
                  <Badge
                    variant="secondary"
                    className="bg-zinc-100 text-[10px] text-zinc-500 dark:bg-zinc-800"
                  >
                    {new Date(logEntry.completedAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Badge>
                )}
              </div>

              <div className="mt-1 text-xs text-zinc-500">
                {logEntry.executedAt !== undefined && (
                  <span title={new Date(logEntry.executedAt).toLocaleString()}>
                    Started{' '}
                    {formatDistanceToNow(new Date(logEntry.executedAt), { addSuffix: true })}
                  </span>
                )}
              </div>

              {isError && (
                <div className="mt-1 text-xs font-bold text-red-600 dark:text-red-400">Failed</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
