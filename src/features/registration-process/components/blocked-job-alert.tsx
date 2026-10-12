'use client';

import { CornerDownRight, ShieldAlert } from 'lucide-react';
import React, { useState } from 'react';

export interface BlockedJob {
  id: string;
  workflowSlug: string;
  input: Record<string, unknown>;
  createdAt: string | Date;
}

export interface BlockedJobAlertProperties {
  jobs: BlockedJob[];
  onResolve: (jobId: string, resolutionData?: Record<string, unknown>) => Promise<void>;
}

const BlockedJobRow: React.FC<{
  job: BlockedJob;
  onResolve: BlockedJobAlertProperties['onResolve'];
}> = ({ job, onResolve }) => {
  const [targetId, setTargetId] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');

  const email = job.input['email'];
  const firstName = job.input['firstName'];
  const inputSummary =
    (typeof email === 'string' && email !== '' ? email : undefined) ??
    (typeof firstName === 'string' && firstName !== '' ? firstName : undefined) ??
    'Unknown Subject';

  const handleResolve = async (): Promise<void> => {
    if (targetId.trim() === '') return;
    setStatus('loading');
    try {
      await onResolve(job.id, { resolvedUserId: targetId });
      setStatus('success');
    } catch (error) {
      console.error(error);
      setStatus('idle');
    }
  };

  if (status === 'success') return <></>;

  return (
    <>
      <tr className="group border-b border-zinc-100 bg-white transition-colors hover:bg-zinc-50/50 dark:border-zinc-800 dark:bg-transparent dark:hover:bg-white/2">
        <td className="py-5 pr-4 pl-0 align-top">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-bold text-zinc-900 dark:text-white">{inputSummary}</span>
          </div>
        </td>

        <td className="px-4 py-5 align-top">
          <div className="flex items-center gap-4">
            <div className="relative max-w-[240px] grow">
              <input
                className="w-full border-b border-zinc-200 bg-transparent py-1 text-xs font-bold text-zinc-900 transition-all placeholder:text-zinc-400 focus:border-orange-500 focus:outline-none dark:border-zinc-800 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-orange-400"
                value={targetId}
                onChange={(event) => setTargetId(event.target.value)}
                placeholder="Assign Partner ID..."
                disabled={status === 'loading'}
              />
            </div>
            <button
              type="button"
              onClick={() => void handleResolve()}
              disabled={targetId.trim() === '' || status === 'loading'}
              className="cursor-pointer text-[11px] font-black tracking-widest text-orange-600 uppercase transition-all hover:text-orange-800 disabled:opacity-30 dark:text-orange-500 dark:hover:text-orange-400"
            >
              {status === 'loading' ? 'Processing...' : 'Resolve'}
            </button>
          </div>
        </td>

        <td className="px-4 py-5 text-right align-top">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="cursor-pointer text-[10px] font-black tracking-wider text-zinc-400 uppercase transition-colors hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
          >
            {isExpanded ? 'Hide Payload' : 'View Payload'}
          </button>
          <div className="mt-1.5 text-[10px] font-bold text-zinc-400 dark:text-zinc-500">
            {new Date(job.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </td>
      </tr>

      {isExpanded && (
        <tr className="animate-in fade-in slide-in-from-top-1 duration-200">
          <td colSpan={3} className="bg-zinc-50/30 py-4 pr-0 pl-0 dark:bg-white/1">
            <div className="flex gap-3">
              <CornerDownRight className="mt-1 h-4 w-4 text-zinc-300 dark:text-zinc-700" />
              <div className="relative grow rounded-xl border border-zinc-100 bg-white p-4 shadow-inner dark:border-zinc-800 dark:bg-zinc-900/50">
                <code className="block font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-zinc-500 dark:text-zinc-400">
                  {JSON.stringify(job.input, undefined, 2)}
                </code>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

export const BlockedJobAlert: React.FC<BlockedJobAlertProperties> = ({ jobs, onResolve }) => {
  if (jobs.length === 0) return <></>;

  return (
    <div className="flex flex-col gap-6 border-l-4 border-orange-500 py-2 pl-8 dark:border-orange-600">
      <div className="flex items-center gap-4">
        <ShieldAlert className="h-5 w-5 text-orange-500" />
        <h2 className="text-base font-black tracking-tight text-zinc-900 uppercase dark:text-white">
          Attention Required
        </h2>
        <span className="rounded-full bg-orange-100 px-3 py-1 text-[11px] font-black text-orange-700 uppercase dark:bg-orange-500/10 dark:text-orange-400">
          {jobs.length} Items
        </span>
      </div>

      <div className="overflow-hidden">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-zinc-100 dark:border-zinc-800">
              <th className="py-3 pr-4 pl-0 text-[10px] font-black tracking-widest text-zinc-400 uppercase dark:text-zinc-400">
                Issue
              </th>
              <th className="px-4 py-3 text-[10px] font-black tracking-widest text-zinc-400 uppercase dark:text-zinc-400">
                Correction
              </th>
              <th className="px-4 py-3 text-right text-[10px] font-black tracking-widest text-zinc-400 uppercase dark:text-zinc-400">
                Timestamp
              </th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <BlockedJobRow key={job.id} job={job} onResolve={onResolve} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
