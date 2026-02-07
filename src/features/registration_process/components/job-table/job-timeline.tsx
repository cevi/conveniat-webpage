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
}): React.ReactNode => {
  // Use log if available, otherwise fallback to taskStatus keys?
  // The log array contains the history. taskStatus contains current state of each.
  // Ideally we use logs for a timeline.
  const logs = job.log ?? [];

  if (logs.length === 0) {
    return <div className="p-4 text-xs text-zinc-400">No logs available for timeline.</div>;
  }

  // Group logs by taskSlug to handle retries
  const groupedLogs: { slug: string; entries: typeof logs; indices: number[] }[] = [];

  for (const [originalIndex, logEntry] of logs.entries()) {
    const lastGroup = groupedLogs.at(-1);
    // If same slug as last group, add to it
    if (lastGroup?.slug === logEntry.taskSlug) {
      lastGroup.entries.push(logEntry);
      lastGroup.indices.push(originalIndex);
    } else {
      // New group
      groupedLogs.push({
        slug: logEntry.taskSlug,
        entries: [logEntry],
        indices: [originalIndex],
      });
    }
  }

  return (
    <div className="relative flex flex-col gap-6 pl-2">
      <div className="absolute top-2 bottom-2 left-[19px] w-px bg-zinc-200 dark:bg-zinc-800" />

      {groupedLogs.map((group, groupIndex): React.ReactNode => {
        // Use the last entry for status
        const lastEntry = group.entries.at(-1);
        if (!lastEntry) return undefined; // Should not happen given logic

        // Determine if any entry in this group is selected
        const isSelected = group.indices.includes(selectedStepIndex);

        const isError = lastEntry.error !== undefined || lastEntry.state === 'failed';
        const isCompleted = lastEntry.completedAt !== undefined || lastEntry.state === 'completed';
        const mapping = STEP_MAPPING[lastEntry.taskSlug];
        const label = mapping?.label ?? lastEntry.taskSlug;

        // Custom State Logic
        const isHumanIntervention =
          lastEntry.taskSlug === 'resolveUser' || lastEntry.taskSlug === 'blockJob';

        let iconClasses = 'border-zinc-100 text-zinc-400 dark:border-zinc-800';
        let textClasses = 'text-zinc-500';

        if (isError) {
          iconClasses = 'border-red-100 text-red-500 dark:border-red-900/30';
          textClasses = 'text-red-600';
        } else if (isHumanIntervention && isCompleted) {
          // Needs Review / Intervention state
          iconClasses =
            'border-amber-100 text-amber-600 dark:border-amber-900/30 dark:text-amber-500';
          textClasses = 'text-amber-700 dark:text-amber-400 font-medium';
        } else if (isCompleted) {
          iconClasses = 'border-emerald-100 text-emerald-500 dark:border-emerald-900/30';
          textClasses = 'text-zinc-900 dark:text-zinc-100';
        }

        // Default to selecting the last one on main click
        const mainClickIndex = group.indices.at(-1);

        return (
          <div key={groupIndex} className="relative z-10 -ml-2">
            {/* Main Group Item */}
            <div
              className={cn(
                'flex cursor-pointer gap-4 rounded-lg px-2 py-0.5 transition-colors',
                isSelected && group.entries.length === 1 // Only highlight main if single item or we want group highlight style
                  ? 'bg-zinc-100 dark:bg-zinc-800'
                  : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/50',
              )}
              onClick={() => {
                if (typeof mainClickIndex === 'number') onSelectStep(mainClickIndex);
              }}
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
                  {lastEntry.completedAt !== undefined && (
                    <Badge
                      variant="secondary"
                      className="bg-zinc-100 text-[10px] text-zinc-500 dark:bg-zinc-800"
                    >
                      {new Date(lastEntry.completedAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Badge>
                  )}
                </div>

                <div className="mt-1 text-xs text-zinc-500">
                  {lastEntry.executedAt !== undefined && (
                    <span title={new Date(lastEntry.executedAt).toLocaleString()}>
                      Started{' '}
                      {formatDistanceToNow(new Date(lastEntry.executedAt), { addSuffix: true })}
                    </span>
                  )}
                </div>

                {isError && (
                  <div className="mt-1 text-xs font-bold text-red-600 dark:text-red-400">
                    Failed
                  </div>
                )}
              </div>
            </div>

            {/* Retry Sub-steps (if more than one try) */}
            {group.entries.length > 1 && (
              <div className="mt-1 ml-5 flex flex-col gap-1 border-l-2 border-zinc-100 pl-4 dark:border-zinc-800">
                {group.entries.map((entry, subIndex): React.ReactNode => {
                  const realIndex = group.indices[subIndex];
                  const isSubSelected = selectedStepIndex === realIndex;
                  // Only show executedAt time or similar for retries
                  const retryTime =
                    entry.executedAt === undefined
                      ? ''
                      : new Date(entry.executedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        });

                  return (
                    <div
                      key={subIndex}
                      className={cn(
                        'cursor-pointer rounded px-2 py-1 text-xs transition-colors',
                        isSubSelected
                          ? 'bg-zinc-100 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
                          : 'text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900/50',
                      )}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (typeof realIndex === 'number') onSelectStep(realIndex);
                      }}
                    >
                      <span>Attempt {subIndex + 1}</span>
                      <span className="ml-2 opacity-50">{retryTime}</span>
                      {entry.state === 'failed' && (
                        <span className="ml-2 text-red-500">Failed</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
