import type { Candidate } from '@/features/registration_process/components/job-table/types';
import { cn } from '@/utils/tailwindcss-override';
import { Check, X } from 'lucide-react';
import React from 'react';

interface DiffViewProperties {
  candidate: Candidate;
  inputData: Record<string, unknown>;
}

export const DiffView: React.FC<DiffViewProperties> = ({ candidate, inputData }) => {
  const { structuredMismatches = [], details } = candidate;

  // Define fields to compare. Note: Input keys might vary, we try standard ones.
  const fields = [
    {
      label: 'First Name',
      inputKeys: ['firstName', 'first_name'],
      apiKey: 'first_name',
      matchKey: 'Name',
    },
    {
      label: 'Last Name',
      inputKeys: ['lastName', 'last_name'],
      apiKey: 'last_name',
      matchKey: 'Name',
    },
    { label: 'Email', inputKeys: ['email'], apiKey: 'email', matchKey: 'Email' },
    {
      label: 'Birthday',
      inputKeys: ['birthDate', 'birthday'],
      apiKey: 'birthday',
      matchKey: 'Birthday',
    },
    { label: 'Nickname', inputKeys: ['nickname'], apiKey: 'nickname', matchKey: 'Nickname' },
  ];

  const getInputValue = (keys: string[]): string | undefined => {
    for (const key of keys) {
      const val = inputData[key];
      if (typeof val === 'string' && val !== '') return val;
    }
    return undefined;
  };

  return (
    <div className="w-full overflow-hidden rounded-md border border-zinc-200 text-xs dark:border-zinc-800">
      {/* Header */}
      <div className="grid grid-cols-[80px_1fr_1fr] bg-zinc-50 font-bold dark:bg-zinc-900/50">
        <div className="p-2 text-zinc-500">Field</div>
        <div className="border-l border-zinc-200 p-2 text-zinc-700 dark:border-zinc-800 dark:text-zinc-300">
          Input
        </div>
        <div className="border-l border-zinc-200 p-2 text-zinc-700 dark:border-zinc-800 dark:text-zinc-300">
          Existing
        </div>
      </div>

      {fields.map((field) => {
        const inputValue = getInputValue(field.inputKeys);
        const apiValueRaw = details?.[field.apiKey as keyof typeof details];
        const apiValue = apiValueRaw ?? undefined;

        // Check verification result for mismatches
        const mismatchEntry = structuredMismatches.find(
          (m) => m.field === field.matchKey || m.field === field.label,
        );

        // Check for value equality (case-insensitive)
        const hasInput = inputValue !== undefined && inputValue !== '';
        const hasApi = apiValue !== undefined && apiValue !== '';
        const valuesMatch =
          hasInput && hasApi && String(inputValue).toLowerCase() === String(apiValue).toLowerCase();

        // Determine mismatch: Explicitly flaged OR values exist but don't match
        const isMismatch = !!Boolean(mismatchEntry) || (hasInput && hasApi && !valuesMatch);

        // Determine highlighting
        let bgClass = 'bg-white dark:bg-transparent';
        let textClass = 'text-zinc-600 dark:text-zinc-400';
        let icon: React.ReactNode | undefined;

        if (isMismatch) {
          bgClass = 'bg-red-50/50 dark:bg-red-900/10';
          textClass = 'text-red-700 dark:text-red-400 font-medium';
          icon = <X className="h-3.5 w-3.5 text-red-500" />;
        } else if (valuesMatch) {
          // If both exist and not a mismatch, it's a match!
          // We can highlight matches too for positive reinforcement
          textClass = 'text-emerald-700 dark:text-emerald-400 font-medium';
          icon = <Check className="h-3.5 w-3.5 text-emerald-500" />;
        }

        return (
          <div
            key={field.label}
            className={cn(
              'grid grid-cols-[80px_1fr_1fr] items-center border-t border-zinc-100 dark:border-zinc-800',
              bgClass,
            )}
          >
            <div className="truncate p-2 font-medium text-zinc-500" title={field.label}>
              {field.label}
            </div>
            <div
              className={cn(
                'border-l border-zinc-100 p-2 break-all dark:border-zinc-800',
                textClass,
              )}
            >
              {inputValue ?? <span className="text-zinc-400 italic dark:text-zinc-600">N/A</span>}
            </div>
            <div
              className={cn(
                'flex items-center justify-between gap-2 border-l border-zinc-100 p-2 break-all dark:border-zinc-800',
                textClass,
              )}
            >
              <span>
                {apiValue ?? <span className="text-zinc-400 italic dark:text-zinc-600">N/A</span>}
              </span>
              {icon}
            </div>
          </div>
        );
      })}
    </div>
  );
};
