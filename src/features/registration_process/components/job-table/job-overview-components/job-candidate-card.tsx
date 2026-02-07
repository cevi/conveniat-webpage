import { DiffView } from '@/features/registration_process/components/job-table/diff-view';
import type { Candidate } from '@/features/registration_process/components/job-table/types';
import { User } from 'lucide-react';
import React from 'react';

interface JobCandidateCardProperties {
  candidate: Candidate;
  inputData: Record<string, unknown>;
  onResolve: (options: { resolvedUserId?: string }) => Promise<void>;
  isResolving: boolean;
}

export const JobCandidateCard: React.FC<JobCandidateCardProperties> = ({
  candidate,
  inputData,
  onResolve,
  isResolving,
}) => {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-zinc-100 p-1.5 dark:bg-zinc-800">
            <User className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-zinc-900 dark:text-white">
              {candidate.personLabel}
            </span>
            <span className="font-mono text-[10px] text-zinc-500">ID: {candidate.personId}</span>
          </div>
        </div>
      </div>

      {candidate.details && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
          {typeof candidate.details.email === 'string' && candidate.details.email !== '' && (
            <div className="flex flex-col">
              <span className="text-zinc-400 uppercase">Email</span>
              <span className="truncate text-zinc-700 dark:text-zinc-300">
                {candidate.details.email}
              </span>
            </div>
          )}
          {typeof candidate.details.birthday === 'string' && candidate.details.birthday !== '' && (
            <div className="flex flex-col">
              <span className="text-zinc-400 uppercase">Birthday</span>
              <span className="text-zinc-700 dark:text-zinc-300">{candidate.details.birthday}</span>
            </div>
          )}
        </div>
      )}

      <DiffView candidate={candidate} inputData={inputData} />

      <button
        type="button"
        onClick={() => void onResolve({ resolvedUserId: candidate.personId })}
        disabled={isResolving}
        className="w-full rounded-md bg-emerald-600 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
      >
        Select & Continue
      </button>
    </div>
  );
};
