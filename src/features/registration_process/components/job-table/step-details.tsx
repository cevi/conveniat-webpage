import { Badge } from '@/components/ui/badge';
import { JsonBlock } from '@/components/ui/json-block';
import {
  DetailRow,
  InputViewer,
} from '@/features/registration_process/components/job-table/job-details-shared';
import type { RegistrationJob } from '@/features/registration_process/components/job-table/types';
import { AlertCircle, Calendar, Clock, Hash, RotateCw } from 'lucide-react';
import React from 'react';

interface StepDetailsProperties {
  step: NonNullable<RegistrationJob['log']>[number];
}

export const StepDetails: React.FC<StepDetailsProperties> = ({ step }) => {
  const stepId = step.id ?? 'N/A';

  return (
    <div className="grid gap-6">
      {/* Step Header */}
      <div className="rounded-xl border border-zinc-200 bg-transparent dark:border-zinc-800">
        <div className="border-b border-zinc-100 bg-zinc-50/50 px-6 py-3 dark:border-zinc-800 dark:bg-zinc-900/30">
          <h3 className="text-xs font-bold tracking-wider text-zinc-500 uppercase">
            Step Metadata
          </h3>
        </div>
        <div className="p-4">
          <DetailRow
            icon={Hash}
            label="Task ID"
            value={<span className="font-mono">{stepId}</span>}
          />
          <DetailRow
            icon={Calendar}
            label="Executed"
            value={
              step.executedAt === undefined ? 'Pending' : new Date(step.executedAt).toLocaleString()
            }
          />
          {step.completedAt !== undefined && (
            <DetailRow
              icon={Clock}
              label="Completed"
              value={new Date(step.completedAt).toLocaleString()}
            />
          )}
          <DetailRow
            icon={RotateCw}
            label="Status"
            value={
              <Badge variant={step.state === 'failed' ? 'destructive' : 'outline'}>
                {step.state}
              </Badge>
            }
          />
        </div>
      </div>

      {/* Error Section for Step */}
      {step.error !== undefined && (
        <div className="rounded-xl border border-red-100 bg-red-50/20 dark:border-red-900/30 dark:bg-red-900/10">
          <div className="px-6 py-3 pb-2">
            <h3 className="flex items-center gap-2 text-sm font-bold text-red-600 dark:text-red-400">
              <AlertCircle className="h-4 w-4" />
              Step Error
            </h3>
          </div>
          <div className="px-6 pb-4">
            <JsonBlock
              data={step.error}
              className="mt-2 text-[10px] break-all whitespace-pre-wrap text-red-600 dark:text-red-300"
            />
          </div>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Input Data */}
        <div className="rounded-xl border border-zinc-200 bg-transparent dark:border-zinc-800">
          <div className="border-b border-zinc-100 bg-zinc-50/50 px-6 py-3 dark:border-zinc-800 dark:bg-zinc-900/30">
            <h3 className="text-xs font-bold tracking-wider text-zinc-500 uppercase">Input</h3>
          </div>
          <div className="p-4">
            <InputViewer data={step.input} />
          </div>
        </div>

        {/* Output Data */}
        <div className="rounded-xl border border-zinc-200 bg-transparent dark:border-zinc-800">
          <div className="border-b border-zinc-100 bg-zinc-50/50 px-6 py-3 dark:border-zinc-800 dark:bg-zinc-900/30">
            <h3 className="text-xs font-bold tracking-wider text-zinc-500 uppercase">Output</h3>
          </div>
          <div className="p-4">
            <InputViewer data={step.output} />
          </div>
        </div>
      </div>
    </div>
  );
};
