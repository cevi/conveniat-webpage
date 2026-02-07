import { JobRow } from '@/features/registration_process/components/job-table/job-row';
import { StatusChip } from '@/features/registration_process/components/job-table/status-chip';
import type {
  JobStatusFilter,
  RegistrationJob,
} from '@/features/registration_process/components/job-table/types';
import { cn } from '@/utils/tailwindcss-override';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Inbox,
  RefreshCcw,
  Search,
  X,
} from 'lucide-react';
import React from 'react';

export * from './types';

export interface JobTableProperties {
  jobs: RegistrationJob[];
  isLoading: boolean;
  isRefetching?: boolean;
  onRefresh?: () => void;
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  totalDocs: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  statusFilter: JobStatusFilter | undefined;
  setStatusFilter: (status?: JobStatusFilter) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sort: string;
  handleSort: (field: string) => void;
}

const SortIndicator: React.FC<{ field: string; currentSort: string }> = ({
  field,
  currentSort,
}) => {
  const isSorted = currentSort === field || currentSort === `-${field}`;
  if (!isSorted) {
    return <ArrowUpDown className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />;
  }
  return currentSort.startsWith('-') ? (
    <ArrowDown className="h-3.5 w-3.5 text-zinc-900 dark:text-white" />
  ) : (
    <ArrowUp className="h-3.5 w-3.5 text-zinc-900 dark:text-white" />
  );
};

export const JobTable: React.FC<JobTableProperties> = ({
  jobs,
  isLoading,
  isRefetching,
  onRefresh,
  page,
  setPage,
  totalDocs,
  hasPrevPage,
  hasNextPage,
  statusFilter,
  setStatusFilter,
  searchQuery,
  setSearchQuery,
  sort,
  handleSort,
}) => {
  const [expandedJobId, setExpandedJobId] = React.useState<string | undefined>();

  const toggleExpand = (id: string): void => {
    setExpandedJobId((current) => (current === id ? undefined : id));
  };

  const handleExportCSV = (): void => {
    // Basic CSV export logic - simplified for refactor
    const headers = ['ID', 'Step', 'Status', 'Started'];
    const rows = jobs.map((job) => {
      // ... simplified export logic or copy from previous
      let status = 'Processing';
      if (job.hasError === true) status = 'Failed';
      else if (job.completedAt !== undefined) status = 'Completed';

      return [
        job.id,
        job.log?.at(-1)?.taskSlug ?? '',
        status,
        new Date(job.createdAt).toISOString(),
      ].join(',');
    });

    // Same implementation as before
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `registration-tasks-${new Date().toISOString().slice(0, 10)}.csv`,
    );
    link.style.visibility = 'hidden';
    document.body.append(link);
    link.click();
    link.remove();
  };

  return (
    <div className="flex flex-col gap-8">
      {/* -- Minimalist Toolbar -- */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative isolate max-w-sm grow">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
            </div>
            <input
              type="text"
              placeholder="Filter tasks..."
              className="block w-full rounded-md border border-zinc-200 bg-white py-1.5 pr-3 pl-9 text-xs transition-all placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-zinc-800 dark:bg-transparent dark:text-white dark:placeholder:text-zinc-600 dark:focus:border-white"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            {(['queued', 'processing', 'awaiting_approval', 'completed', 'failed'] as const).map(
              (status) => (
                <StatusChip
                  key={status}
                  status={status}
                  active={statusFilter === status}
                  onClick={() => setStatusFilter(statusFilter === status ? undefined : status)}
                />
              ),
            )}

            {(statusFilter !== undefined || searchQuery !== '') && (
              <button
                onClick={() => {
                  setStatusFilter(undefined);
                  setSearchQuery('');
                }}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-bold text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white"
              >
                Clear all <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex grow items-center justify-end gap-3">
            {onRefresh !== undefined && (
              <button
                onClick={onRefresh}
                disabled={isLoading || isRefetching}
                className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-4 text-xs font-bold transition-all hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:bg-transparent dark:text-zinc-300 dark:hover:bg-white/5"
              >
                <RefreshCcw className={cn('h-3.5 w-3.5', { 'animate-spin': isRefetching })} />
                <span>View</span>
              </button>
            )}
            <button
              onClick={handleExportCSV}
              className="inline-flex h-9 cursor-pointer items-center rounded-md bg-zinc-900 px-4 text-xs font-bold text-white shadow-sm transition-all hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* -- Table -- */}
      {/* Removed rounded-xl overflow-hidden to allow for sticky headers if needed, but keeping container for style */}
      <div className="overflow-hidden rounded-xl border border-zinc-100 bg-zinc-50/50 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/20">
        <div className="relative overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900/50">
                <th
                  className="group w-[140px] cursor-pointer px-4 py-3 text-xs font-bold tracking-wider text-zinc-500 uppercase transition-colors hover:bg-zinc-100/50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white"
                  onClick={() => handleSort('id')}
                >
                  <div className="flex items-center gap-1.5">
                    Task
                    <SortIndicator field="id" currentSort={sort} />
                  </div>
                </th>
                <th
                  className="group w-auto cursor-pointer px-4 py-3 text-xs font-bold tracking-wider text-zinc-500 uppercase transition-colors hover:bg-zinc-100/50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white"
                  onClick={() => handleSort('log')}
                >
                  <div className="flex items-center gap-1.5">
                    Step
                    <SortIndicator field="log" currentSort={sort} />
                  </div>
                </th>
                <th
                  className="group w-[140px] cursor-pointer px-4 py-3 text-right text-xs font-bold tracking-wider text-zinc-500 uppercase transition-colors hover:bg-zinc-100/50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center justify-end gap-1.5">
                    Status
                    <SortIndicator field="status" currentSort={sort} />
                  </div>
                </th>
                <th
                  className="group w-[160px] cursor-pointer px-4 py-3 text-right text-xs font-bold tracking-wider text-zinc-500 uppercase transition-colors hover:bg-zinc-100/50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white"
                  onClick={() => handleSort('createdAt')}
                >
                  <div className="flex items-center justify-end gap-1.5">
                    Started
                    <SortIndicator field="createdAt" currentSort={sort} />
                  </div>
                </th>
                <th className="w-[60px] px-4 py-3 text-right text-xs font-bold tracking-wider text-zinc-500 uppercase" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {isLoading &&
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index} className="animate-pulse bg-white dark:bg-transparent">
                    <td className="px-4 py-5">
                      <div className="h-3 w-20 rounded bg-zinc-100 dark:bg-zinc-800" />
                    </td>
                    <td className="px-4 py-5">
                      <div className="h-3 w-full rounded bg-zinc-100 dark:bg-zinc-800" />
                    </td>
                    <td className="px-4 py-5 text-right">
                      <div className="ml-auto h-3 w-16 rounded bg-zinc-100 dark:bg-zinc-800" />
                    </td>
                    <td className="px-4 py-5 text-right">
                      <div className="ml-auto h-3 w-20 rounded bg-zinc-100 dark:bg-zinc-800" />
                    </td>
                    <td className="px-4 py-5 text-right">
                      <div className="ml-auto h-4 w-4 rounded bg-zinc-100 dark:bg-zinc-800" />
                    </td>
                  </tr>
                ))}

              {!isLoading && jobs.length === 0 && (
                <tr className="bg-white dark:bg-transparent">
                  <td colSpan={5} className="py-32 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="rounded-full bg-zinc-50 p-4 dark:bg-zinc-800/50">
                        <Inbox className="h-8 w-8 text-zinc-300 dark:text-zinc-600" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          No tasks found
                        </p>
                        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                          Try adjusting your search or filters to find what you&apos;re looking for.
                        </p>
                      </div>
                      {(statusFilter !== undefined || searchQuery !== '') && (
                        <button
                          onClick={() => {
                            setStatusFilter(undefined);
                            setSearchQuery('');
                          }}
                          className="mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-700 shadow-sm transition-all hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-white"
                        >
                          Clear all filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}

              {!isLoading &&
                jobs.length > 0 &&
                jobs.map((job) => (
                  <JobRow
                    key={job.id}
                    job={job}
                    isExpanded={expandedJobId === job.id}
                    onToggle={() => toggleExpand(job.id)}
                  />
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* -- Pagination -- */}
      <div className="flex items-center justify-between border-t border-zinc-50 py-4 dark:border-zinc-900">
        <p className="text-[11px] font-bold tracking-widest text-zinc-400 uppercase">
          Showing{' '}
          <span className="text-zinc-900 dark:text-white">
            {(page - 1) * 10 + 1}-{Math.min(page * 10, totalDocs)}
          </span>{' '}
          of <span className="text-zinc-900 dark:text-white">{totalDocs}</span>
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={!hasPrevPage}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-400 transition-all hover:bg-zinc-50 hover:text-zinc-900 disabled:opacity-30 dark:border-zinc-800 dark:bg-transparent dark:hover:bg-white/5 dark:hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasNextPage}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-400 transition-all hover:bg-zinc-50 hover:text-zinc-900 disabled:opacity-30 dark:border-zinc-800 dark:bg-transparent dark:hover:bg-white/5 dark:hover:text-white"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
