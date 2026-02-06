'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/utils/tailwindcss-override';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  Copy,
  Inbox,
  Mail,
  Plus,
  RefreshCcw,
  Search,
  User,
  Users,
  X,
} from 'lucide-react';
import React from 'react';

// --- Types ---
export interface RegistrationJob {
  id: string;
  createdAt: string | Date;
  completedAt?: string | Date;
  processing?: boolean;
  hasError?: boolean;
  taskStatus?: Record<string, { status: string; completedAt?: string | Date }>;
  log?: { taskSlug: string }[];
}

export type JobStatusFilter =
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'awaiting_approval';

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

// --- Status Config ---
const STATUS_CONFIG: Record<
  JobStatusFilter,
  { label: string; icon: React.ElementType; color: string }
> = {
  queued: { label: 'Queued', icon: Clock, color: 'text-zinc-400 dark:text-zinc-500' },
  processing: { label: 'In Progress', icon: Circle, color: 'text-blue-500' },
  completed: { label: 'Done', icon: Circle, color: 'text-emerald-500 fill-emerald-500' },
  failed: { label: 'Canceled', icon: X, color: 'text-red-500' },
  awaiting_approval: { label: 'Await Approval', icon: AlertTriangle, color: 'text-orange-500' },
};

const STEP_MAPPING: Record<string, { label: string; icon: React.ElementType }> = {
  resolveUser: { label: 'Resolving User', icon: User },
  blockJob: { label: 'Needs Review', icon: AlertTriangle },
  ensureGroupMembership: { label: 'Group Access', icon: Users },
  ensureEventMembership: { label: 'Event Access', icon: Calendar },
  confirmationMessage: { label: 'Sent Confirmation', icon: Mail },
};

// --- Helpers ---
const copyToClipboard = (text: string): void => {
  void navigator.clipboard.writeText(text);
};

const StatusChip: React.FC<{
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

const JobStatusIndicator: React.FC<{ job: RegistrationJob }> = ({ job }) => {
  let status: JobStatusFilter = 'queued';

  // Detect "Await Approval" - if blockJob is the latest task and it's completed (or more accurately, if it triggered the block)
  // In our workflow, if a job is blocked, it essentially stops.
  const taskKeys = Object.keys(job.taskStatus ?? {});
  const lastTask = taskKeys.at(-1);
  const isCurrentlyBlocked = lastTask === 'blockJob';

  if (job.hasError === true) status = 'failed';
  else if (isCurrentlyBlocked) status = 'awaiting_approval';
  else if (job.completedAt !== undefined) status = 'completed';
  else if (job.processing === true) status = 'processing';

  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-zinc-100">
      <Icon className={cn('h-3.5 w-3.5', config.color)} />
      <span>{config.label}</span>
    </div>
  );
};

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

// --- Main Component ---

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
  const [copiedId, setCopiedId] = React.useState<string | undefined>();

  const handleCopy = (id: string): void => {
    copyToClipboard(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(undefined), 2000);
  };

  const getStepElement = (job: RegistrationJob): React.ReactNode => {
    const taskStatusKeys = Object.keys(job.taskStatus ?? {});
    const slug = taskStatusKeys.at(-1) ?? job.log?.at(-1)?.taskSlug;

    if (slug === undefined || slug === '') {
      return <span className="text-xs font-bold text-zinc-400">Awaiting assignment...</span>;
    }

    const mapping = STEP_MAPPING[slug];
    if (mapping !== undefined) {
      const Icon = mapping.icon;
      return (
        <Badge
          variant="secondary"
          className="flex w-fit items-center gap-1.5 rounded-md border-zinc-200 bg-zinc-100/30 px-2 py-1 text-[11px] font-bold text-zinc-600 transition-colors hover:bg-zinc-200/50 hover:text-zinc-900 dark:border-zinc-800 dark:bg-transparent dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-zinc-100"
        >
          <Icon className="h-4 w-4" />
          {mapping.label}
        </Badge>
      );
    }

    const formattedSlug = slug
      .replaceAll('-', ' ')
      .replaceAll(/([A-Z])/g, ' $1')
      .trim();

    return (
      <Badge
        variant="secondary"
        className="flex w-fit items-center gap-1.5 rounded-md border-zinc-200 bg-zinc-100/30 px-2 py-1 text-[11px] font-bold text-zinc-600 transition-colors hover:bg-zinc-200/50 hover:text-zinc-900 dark:border-zinc-800 dark:bg-transparent dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-zinc-100"
      >
        {formattedSlug}
      </Badge>
    );
  };

  const getCurrentTaskName = (job: RegistrationJob): string | undefined => {
    const taskStatusKeys = Object.keys(job.taskStatus ?? {});
    const slug = taskStatusKeys.at(-1) ?? job.log?.at(-1)?.taskSlug;
    if (slug === undefined || slug === '') return undefined;

    const mapping = STEP_MAPPING[slug];
    if (mapping !== undefined) return mapping.label;

    return slug
      .replaceAll('-', ' ')
      .replaceAll(/([A-Z])/g, ' $1')
      .trim();
  };

  const handleExportCSV = (): void => {
    const headers = ['ID', 'Workflow', 'Step', 'Status', 'Started'];
    const rows = jobs.map((job) => {
      const taskName = getCurrentTaskName(job);
      let statusLabel = 'Queued';

      const taskKeys = Object.keys(job.taskStatus ?? {});
      const isCurrentlyBlocked = taskKeys.at(-1) === 'blockJob';

      if (job.hasError === true) statusLabel = 'Canceled';
      else if (isCurrentlyBlocked) statusLabel = 'Await Approval';
      else if (job.completedAt !== undefined) statusLabel = 'Done';
      else if (job.processing === true) statusLabel = 'In Progress';

      return [
        job.id,
        'Workflow',
        taskName ?? 'Awaiting assignment...',
        statusLabel,
        new Date(job.createdAt).toLocaleString(),
      ]
        .map((field) => `"${field}"`)
        .join(',');
    });

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
          {/* Search Integrated with Linear Aesthetics */}
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

          {/* Filter Chips */}
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
      <div className="overflow-hidden rounded-xl border border-zinc-100 bg-zinc-50/50 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/20">
        <div className="relative overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800">
                <th
                  className="group cursor-pointer border-r border-zinc-100 px-4 py-3 text-xs font-bold tracking-wider text-zinc-500 uppercase transition-colors hover:bg-zinc-100/50 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white"
                  onClick={() => handleSort('id')}
                >
                  <div className="flex items-center gap-1.5">
                    Task
                    <SortIndicator field="id" currentSort={sort} />
                  </div>
                </th>
                <th
                  className="group cursor-pointer border-r border-zinc-100 px-4 py-3 text-xs font-bold tracking-wider text-zinc-500 uppercase transition-colors hover:bg-zinc-100/50 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white"
                  onClick={() => handleSort('log')}
                >
                  <div className="flex items-center gap-1.5">
                    Step
                    <SortIndicator field="log" currentSort={sort} />
                  </div>
                </th>
                <th
                  className="group cursor-pointer border-r border-zinc-100 px-4 py-3 text-right text-xs font-bold tracking-wider text-zinc-500 uppercase transition-colors hover:bg-zinc-100/50 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center justify-end gap-1.5">
                    Status
                    <SortIndicator field="status" currentSort={sort} />
                  </div>
                </th>
                <th
                  className="group cursor-pointer px-4 py-3 text-right text-xs font-bold tracking-wider text-zinc-500 uppercase transition-colors hover:bg-zinc-100/50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white"
                  onClick={() => handleSort('createdAt')}
                >
                  <div className="flex items-center justify-end gap-1.5">
                    Started
                    <SortIndicator field="createdAt" currentSort={sort} />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {isLoading &&
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index} className="animate-pulse bg-white dark:bg-transparent">
                    <td className="border-r border-zinc-100 px-4 py-5 dark:border-zinc-800">
                      <div className="h-3 w-20 rounded bg-zinc-100 dark:bg-zinc-800" />
                    </td>
                    <td className="border-r border-zinc-100 px-4 py-5 dark:border-zinc-800">
                      <div className="h-3 w-full rounded bg-zinc-100 dark:bg-zinc-800" />
                    </td>
                    <td className="border-r border-zinc-100 px-4 py-5 text-right dark:border-zinc-800">
                      <div className="ml-auto h-3 w-16 rounded bg-zinc-100 dark:bg-zinc-800" />
                    </td>
                    <td className="px-4 py-5 text-right">
                      <div className="ml-auto h-3 w-20 rounded bg-zinc-100 dark:bg-zinc-800" />
                    </td>
                  </tr>
                ))}

              {!isLoading && jobs.length === 0 && (
                <tr className="bg-white dark:bg-transparent">
                  <td colSpan={4} className="py-32 text-center">
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
                jobs.map((job) => {
                  return (
                    <tr
                      key={job.id}
                      className="group bg-white transition-colors hover:bg-zinc-50 dark:bg-transparent dark:hover:bg-white/2"
                    >
                      <td className="border-r border-zinc-100 px-4 py-3 align-top whitespace-nowrap dark:border-zinc-800">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-zinc-900 tabular-nums dark:text-white">
                            {job.id}
                          </span>
                          <button
                            onClick={() => handleCopy(job.id)}
                            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border-none bg-transparent ring-0 transition-all outline-none hover:bg-zinc-100 focus:ring-0 focus:outline-none dark:hover:bg-white/5"
                            title="Copy ID"
                          >
                            {copiedId === job.id ? (
                              <Check className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <Copy className="h-4 w-4 text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100 hover:text-zinc-900 dark:text-zinc-500 dark:group-hover:text-zinc-300" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="border-r border-zinc-100 px-4 py-3 align-top dark:border-zinc-800">
                        {getStepElement(job)}
                      </td>
                      <td className="border-r border-zinc-100 px-4 py-3 text-right align-top dark:border-zinc-800">
                        <div className="flex justify-end">
                          <JobStatusIndicator job={job} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right align-top whitespace-nowrap">
                        <span className="text-xs font-bold text-zinc-400 tabular-nums dark:text-zinc-400">
                          {new Date(job.createdAt).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </span>
                      </td>
                    </tr>
                  );
                })}
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
