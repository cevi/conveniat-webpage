import type { JobStatusFilter } from '@/features/registration_process/components/job-table/types';
import { STATUS_CONFIG } from '@/features/registration_process/components/job-table/types'; // We'll need to define types shared
import { cn } from '@/utils/tailwindcss-override';
import { Plus } from 'lucide-react';
import React from 'react';

export const StatusChip: React.FC<{
  status: JobStatusFilter;
  active: boolean;
  onClick: () => void;
}> = ({ status, active, onClick }) => {
  const config = STATUS_CONFIG[status];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-dashed px-2.5 py-1 text-xs font-semibold transition-all',
        active
          ? 'border-zinc-900 bg-zinc-900 text-white shadow-sm dark:border-white dark:bg-white dark:text-zinc-900'
          : 'border-zinc-200 bg-transparent text-zinc-500 hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-white',
      )}
    >
      {active ? <Plus className="h-3 w-3 rotate-45" /> : <Plus className="h-3 w-3" />}
      <span>{config.label}</span>
      {active && <span className="ml-1 h-3.5 w-px bg-white/20 dark:bg-black/20" />}
      {active && <span className="ml-0.5 text-[10px] italic opacity-80">active</span>}
    </button>
  );
};
