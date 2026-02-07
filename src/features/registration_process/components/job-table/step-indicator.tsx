import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { RegistrationJob } from '@/features/registration_process/components/job-table/types';
import {
  STEP_MAPPING,
  WORKFLOW_STEPS,
} from '@/features/registration_process/components/job-table/types';
import { cn } from '@/utils/tailwindcss-override';
import React from 'react';

export const StepIndicator: React.FC<{ job: RegistrationJob }> = ({ job }) => {
  // Determine current step index
  // Logic: find the last completed step or the current processing/failed step
  const taskStatusKeys = Object.keys(job.taskStatus ?? {});
  const lastTaskSlug = taskStatusKeys.at(-1) ?? job.log?.at(-1)?.taskSlug;

  let currentStepIndex = -1;

  if (lastTaskSlug) {
    // Find the index of the last task in our defined workflow
    // Note: Workflow steps defined in types.ts might need to match exact slug
    currentStepIndex = WORKFLOW_STEPS.indexOf(lastTaskSlug);

    // If not found (dynamic steps?), default to 0 or logic to handle unknown steps
    if (currentStepIndex === -1 && taskStatusKeys.length > 0) {
      // If we have tasks but they aren't in our "standard" list,
      // we might just show them as "in progress" generally
      // For now, let's try to map best effort.
      // If the last task is complete, we show full progress?
      // Let's stick to the visualizer for known steps.
    }
  }

  // Display label for the current/last step
  const currentStepLabel = lastTaskSlug
    ? (STEP_MAPPING[lastTaskSlug]?.label ?? lastTaskSlug)
    : 'Initializing...';

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
        {currentStepLabel}
      </span>
      <div className="flex gap-1">
        {WORKFLOW_STEPS.map((stepSlug, index) => {
          // Determine state of this specific dot
          let state: 'pending' | 'active' | 'completed' | 'failed' = 'pending';

          // Check if this step is present in taskStatus
          const stepStatus = job.taskStatus?.[stepSlug];

          if (stepStatus?.status === 'completed' || stepStatus?.completedAt) {
            state = 'completed';
          } else if (stepSlug === lastTaskSlug) {
            if (job.hasError) state = 'failed';
            else if (job.processing) state = 'active';
            else if (stepStatus?.status === 'active') state = 'active';
            else state = 'completed'; // If it's the last one and not processing/error, maybe it's done? Or stuck?
            // Actually if job.completedAt is set, all previous are completed
          } else if (index < currentStepIndex) {
            state = 'completed';
          }

          // Correction: if the entire job is completed, all steps before it should be green essentially
          if (job.completedAt && index <= currentStepIndex) {
            state = 'completed';
          }

          return (
            <TooltipProvider key={stepSlug}>
              <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      'h-1.5 w-6 rounded-full transition-all',
                      ((): string => {
                        if (state === 'completed') {
                          if (stepSlug === 'blockJob' && lastTaskSlug === 'blockJob')
                            return 'bg-amber-500';
                          return 'bg-emerald-500';
                        }
                        if (state === 'active') return 'animate-pulse bg-blue-500';
                        if (state === 'failed') return 'bg-red-500';
                        return 'bg-zinc-200 dark:bg-zinc-800';
                      })(),
                    )}
                  />
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-[10px] font-semibold">
                  {STEP_MAPPING[stepSlug]?.label ?? stepSlug}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    </div>
  );
};
