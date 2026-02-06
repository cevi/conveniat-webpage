'use client';

import {
  BlockedJobAlert,
  type BlockedJob,
} from '@/features/registration_process/components/blocked-job-alert';
import {
  JobTable,
  type JobStatusFilter,
  type RegistrationJob,
} from '@/features/registration_process/components/job-table';
import { useJobFilters } from '@/features/registration_process/hooks/use-job-filters';
import { toast } from '@/lib/toast';
import { trpc, TRPCProvider } from '@/trpc/client';
import { Loader2 } from 'lucide-react';
import React from 'react';

const ManagementContent: React.FC = () => {
  const { state, actions } = useJobFilters();

  const recentJobsQuery = trpc.registration.getRecentJobs.useQuery(
    {
      page: state.page,
      limit: 10,
      status: state.status,
      search: state.debouncedSearch,
      sort: state.sort,
    },
    {
      refetchInterval: 5000,
      // @ts-expect-error - feature of tanstack query used by trpc
      keepPreviousData: true,
    },
  );

  const pendingReviewsQuery = trpc.registration.getPendingReviews.useQuery(undefined, {
    refetchInterval: 5000,
  });

  const resolveJobMutation = trpc.registration.resolveBlockedJob.useMutation();

  const handleResolveJob = async (
    jobId: string,
    resolutionData?: Record<string, unknown>,
  ): Promise<void> => {
    try {
      await resolveJobMutation.mutateAsync({
        jobId,
        resolutionData,
      });
      toast.success('Resolution confirmed');
      void pendingReviewsQuery.refetch();
    } catch (error) {
      console.error('Resolution failed:', error);
      toast.error('Failed to resolve');
    }
  };

  return (
    <div className="flex flex-col gap-12">
      {/* Attention Items (Blocked Jobs) */}
      {pendingReviewsQuery.data !== undefined && pendingReviewsQuery.data.length > 0 && (
        <section className="animate-in fade-in slide-in-from-top-2 duration-500">
          <BlockedJobAlert
            jobs={pendingReviewsQuery.data as unknown as BlockedJob[]}
            onResolve={handleResolveJob}
          />
        </section>
      )}

      {/* History Table */}
      <section className="animate-in fade-in slide-in-from-bottom-2 duration-500">
        {/* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition */}
        {recentJobsQuery.data ? (
          <JobTable
            jobs={recentJobsQuery.data.docs as unknown as RegistrationJob[]}
            totalDocs={recentJobsQuery.data.totalDocs}
            hasPrevPage={recentJobsQuery.data.hasPrevPage}
            hasNextPage={recentJobsQuery.data.hasNextPage}
            isLoading={recentJobsQuery.isLoading}
            isRefetching={recentJobsQuery.isRefetching}
            onRefresh={() => void recentJobsQuery.refetch()}
            page={state.page}
            searchQuery={state.search}
            statusFilter={state.status as JobStatusFilter}
            setPage={actions.setPage}
            setSearchQuery={actions.setSearch}
            setStatusFilter={actions.setStatus as (status?: JobStatusFilter) => void}
            sort={state.sort}
            handleSort={actions.setSort}
          />
        ) : (
          <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-300 dark:text-zinc-700" />
          </div>
        )}
      </section>
    </div>
  );
};

export const ManagementView: React.FC = () => {
  return (
    <TRPCProvider>
      <div className="min-h-screen bg-white px-8 py-12 transition-colors duration-300 lg:px-12 dark:bg-[#141414]">
        <div className="mb-12">
          <h2 className="text-sm font-black tracking-widest text-zinc-900 uppercase dark:text-white">
            Helfer Anmeldung
          </h2>
          <p className="mt-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Verwalte aktive Workflows und erledige ausstehende Aufgaben.
          </p>
        </div>
        <ManagementContent />
      </div>
    </TRPCProvider>
  );
};

export default ManagementView;
