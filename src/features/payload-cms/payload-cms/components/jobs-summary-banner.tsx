import configPromise from '@payload-config';
import { getPayload } from 'payload';
import React from 'react';

interface WorkerDocument {
  id: string;
  workerId: string;
  hostname: string;
  queues?: { name: string }[];
  lastHeartbeat: string;
}

interface JobDocument {
  id: string;
  taskSlug: string;
  workflowSlug?: string;
  createdAt: string;
  updatedAt: string;
}

function getDurationText(createdAt: string): string {
  const runDurationSec = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
  return runDurationSec < 60 ? `${runDurationSec}s` : `${Math.floor(runDurationSec / 60)}m`;
}

export const JobsSummaryBanner: React.FC = async () => {
  const payload = await getPayload({ config: configPromise });

  // Get active workers (heartbeat within last 2 minutes)
  const twoMinutesAgo = new Date();
  twoMinutesAgo.setMinutes(twoMinutesAgo.getMinutes() - 2);

  const activeWorkersResult = await payload.find({
    collection: 'payload-workers',
    where: {
      lastHeartbeat: { greater_than: twoMinutesAgo.toISOString() },
    },
    limit: 100,
    context: { internal: true },
  });

  const activeWorkers = activeWorkersResult.docs as unknown as WorkerDocument[];

  // Get currently processing jobs
  const processingJobsResult = await payload.find({
    collection: 'payload-jobs',
    where: {
      and: [{ processing: { equals: true } }, { completedAt: { exists: false } }],
    },
    limit: 100,
    context: { internal: true },
  });

  const processingJobs = processingJobsResult.docs as unknown as JobDocument[];

  return (
    <div className="mb-6 w-full rounded-xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800/80 dark:bg-gray-900">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        {/* Workers Status */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span
                className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                  activeWorkers.length > 0 ? 'bg-green-400' : 'bg-amber-400'
                }`}
              />
              <span
                className={`relative inline-flex h-3 w-3 rounded-full ${
                  activeWorkers.length > 0 ? 'bg-green-500' : 'bg-amber-500'
                }`}
              />
            </span>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Active Workers ({activeWorkers.length})
            </h3>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Available runner instances polling and executing tasks.
          </p>

          {activeWorkers.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {activeWorkers.map((worker) => {
                const queuesList = (worker.queues ?? []).map((q) => q.name).join(', ');
                return (
                  <div
                    key={worker.id}
                    className="flex flex-col rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs dark:border-gray-800 dark:bg-gray-950"
                  >
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                      {worker.hostname}{' '}
                      <span className="font-normal text-gray-400">
                        ({worker.workerId.slice(0, 8)})
                      </span>
                    </span>
                    <span className="mt-0.5 text-gray-500 dark:text-gray-400">
                      Queues: {queuesList === '' ? 'none' : queuesList}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-3 text-sm text-gray-400 italic">
              No workers registered or heartbeating. Jobs might remain queued.
            </div>
          )}
        </div>

        {/* Processing Jobs */}
        <div className="flex-1 border-t border-gray-100 pt-5 md:border-t-0 md:border-l md:pt-0 md:pl-6 dark:border-gray-800">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            Active Jobs ({processingJobs.length})
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Tasks currently being executed by the workers.
          </p>

          {processingJobs.length > 0 ? (
            <div className="mt-3 space-y-2">
              {processingJobs.map((job) => {
                const durationText = getDurationText(job.createdAt);

                return (
                  <div
                    key={job.id}
                    className="flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50/50 px-3 py-2 text-xs dark:border-blue-950/40 dark:bg-blue-950/20"
                  >
                    <div className="flex flex-col">
                      <span className="font-semibold text-blue-900 dark:text-blue-400">
                        {job.taskSlug}{' '}
                        <span className="font-normal text-gray-400">({String(job.id)})</span>
                      </span>
                      {job.workflowSlug !== undefined && job.workflowSlug !== '' && (
                        <span className="mt-0.5 text-gray-500 dark:text-gray-400">
                          Workflow: {job.workflowSlug}
                        </span>
                      )}
                    </div>
                    <span className="rounded bg-blue-100 px-2 py-0.5 font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                      Running for {durationText}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-3 text-sm text-gray-400 italic">No jobs currently processing.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobsSummaryBanner;
