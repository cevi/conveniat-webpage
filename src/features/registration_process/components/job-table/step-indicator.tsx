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
          let state: 'queued' | 'active' | 'completed' | 'failed' | 'blocked' = 'queued';

          // Check if this step is present in taskStatus
          const stepStatus = job.taskStatus?.[stepSlug];

          if (
            stepStatus?.status === 'completed' ||
            (stepStatus?.completedAt !== undefined && stepStatus.completedAt !== null)
          ) {
            state = 'completed';
          } else if (stepSlug === lastTaskSlug) {
            if (job.hasError === true) state = 'failed';
            else if (lastTaskSlug === 'blockJob') state = 'blocked';
            else if (job.processing === true) state = 'active';
            else if (stepStatus?.status === 'active') state = 'active';
            else if (job.completedAt !== undefined && job.completedAt !== null) state = 'completed';
            else state = 'queued'; // queued and ready to process
          } else if (index < currentStepIndex) {
            state = 'completed';
          }

          // Correction: if the entire job is completed, all steps before it should be green essentially
          if (
            job.completedAt !== undefined &&
            job.completedAt !== null &&
            index <= currentStepIndex
          ) {
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
                        if (state === 'completed') return 'bg-emerald-500';
                        if (state === 'blocked') return 'bg-amber-500';
                        if (state === 'active') return 'animate-pulse bg-blue-500';
                        if (state === 'queued') return 'animate-pulse bg-zinc-400 dark:bg-zinc-600';
                        return 'bg-red-500'; // state === 'failed'
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
