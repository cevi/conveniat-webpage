import { Badge } from '@/components/ui/badge';
import { JsonBlock } from '@/components/ui/json-block';
import {
  DetailRow,
  ExpandableSection,
  InputViewer,
  flattenObject,
  renderValue,
} from '@/features/registration_process/components/job-table/job-details-shared';
import type { RegistrationJob } from '@/features/registration_process/components/job-table/types';
import { cn } from '@/utils/tailwindcss-override';
import { AlertCircle, Calendar, ChevronDown, Clock, Hash, RotateCw } from 'lucide-react';
import React, { useState } from 'react';

interface StepDetailsProperties {
  step: NonNullable<RegistrationJob['log']>[number];
}

export const StepDetails: React.FC<StepDetailsProperties> = ({ step }) => {
  const [isErrorExpanded, setIsErrorExpanded] = useState(false);
  const stepId = step.id ?? 'N/A';

  const errorData = step.error as Record<string, unknown> | undefined;
  const errorName = typeof errorData?.['name'] === 'string' ? errorData['name'] : 'Error';
  const errorMessage =
    typeof errorData?.['message'] === 'string' ? errorData['message'] : 'Unknown error';
  const errorStack = typeof errorData?.['stack'] === 'string' ? errorData['stack'] : undefined;

  return (
    <div className="grid gap-6">
      {/* Step Header */}
      <ExpandableSection title="Step Metadata">
        <DetailRow
          icon={Hash}
          label="Task ID"
          value={<span className="font-mono">{stepId}</span>}
        />
        <DetailRow
          icon={Calendar}
          label="Executed"
          value={
            step.executedAt === undefined || step.executedAt === null
              ? 'Pending'
              : new Date(step.executedAt).toLocaleString()
          }
        />
        {step.completedAt !== undefined && step.completedAt !== null && (
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
      </ExpandableSection>

      {/* Error Section for Step */}
      {step.error !== undefined && (
        <div className="overflow-hidden rounded-xl border border-red-100 bg-red-50/20 dark:border-red-900/30 dark:bg-red-900/10">
          <button
            type="button"
            onClick={() => setIsErrorExpanded(!isErrorExpanded)}
            className="flex w-full cursor-pointer items-start justify-between border-transparent px-6 py-3 ring-0 transition-colors outline-none hover:bg-red-100/50 focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:outline-none dark:hover:bg-red-900/20"
          >
            <div className="flex flex-col items-start gap-1">
              <h3 className="flex items-center gap-2 text-sm font-bold text-red-600 dark:text-red-400">
                <AlertCircle className="h-4 w-4" />
                Step Error
              </h3>
              {isErrorExpanded === false && (
                <div className="mt-1 text-left text-xs text-red-600/80 dark:text-red-400/80">
                  <span className="font-semibold">{errorName}:</span> {errorMessage}
                </div>
              )}
            </div>
            <div className="flex shrink-0 items-center justify-center pt-1 pl-4">
              <ChevronDown
                className={cn(
                  'h-4 w-4 text-red-600 transition-transform duration-200 dark:text-red-400',
                  isErrorExpanded && 'rotate-180',
                )}
              />
            </div>
          </button>
          {isErrorExpanded && (
            <div className="border-t border-red-100/50 px-6 py-4 dark:border-red-900/30">
              {errorStack === undefined ? (
                <JsonBlock
                  data={step.error}
                  className="mt-2 text-[10px] break-all whitespace-pre-wrap text-red-600 dark:text-red-300"
                />
              ) : (
                <pre className="overflow-x-auto font-mono text-[10px] leading-relaxed wrap-break-word whitespace-pre-wrap text-red-600 dark:text-red-300">
                  {errorStack}
                </pre>
              )}
            </div>
          )}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Input Data */}
        {/* Input Data */}
        <ExpandableSection title="Input">
          {Object.entries(flattenObject(step.input as Record<string, unknown>)).map(
            ([key, value]) => (
              <DetailRow
                key={key}
                label={key}
                value={<span className="font-mono wrap-break-word">{renderValue(value)}</span>}
              />
            ),
          )}
        </ExpandableSection>

        {/* Output Data */}
        <ExpandableSection title="Output">
          <InputViewer data={step.output} />
        </ExpandableSection>
      </div>
    </div>
  );
};
