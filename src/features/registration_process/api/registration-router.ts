import { canUserAccessAdminPanel } from '@/features/payload-cms/payload-cms/access-rules/can-access-admin-panel';
import config from '@/features/payload-cms/payload.config';
import { registrationInputSchema } from '@/features/registration_process/workflows/input-schema';
import { createTRPCRouter, trpcBaseProcedure } from '@/trpc/init';
import { TRPCError } from '@trpc/server';
import type { Where } from 'payload';
import { getPayload } from 'payload';
import { z } from 'zod';

const adminProcedure = trpcBaseProcedure.use(async ({ ctx, next }) => {
  const hasAccess = await canUserAccessAdminPanel({ user: ctx.user });
  if (!hasAccess) {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  return next({ ctx });
});

export const registrationRouter = createTRPCRouter({
  trigger: adminProcedure.input(registrationInputSchema).mutation(async ({ input }) => {
    const payload = await getPayload({ config });

    const job = await payload.jobs.queue({
      workflow: 'registrationWorkflow',
      input: {
        input,
      },
    });

    return {
      jobId: job.id,
    };
  }),

  getRecentJobs: adminProcedure
    .input(
      z.object({
        page: z.number().optional().default(1),
        limit: z.number().optional().default(20),
        sort: z.string().optional().default('-createdAt'),
        search: z.string().optional(),
        status: z
          .enum(['queued', 'processing', 'completed', 'failed', 'awaiting_approval'])
          .nullable()
          .optional(),
      }),
    )
    .query(async ({ input }) => {
      const payload = await getPayload({ config });

      const where: Where = {
        workflowSlug: {
          equals: 'registrationWorkflow',
        },
      };

      if (input.status !== undefined) {
        switch (input.status) {
          case 'failed': {
            where['hasError'] = { equals: true };
            break;
          }
          case 'completed': {
            where['completedAt'] = { exists: true };
            where['hasError'] = { not_equals: true };
            break;
          }
          case 'processing': {
            where['processing'] = { equals: true };
            where['completedAt'] = { exists: false };
            where['hasError'] = { not_equals: true };
            break;
          }
          case 'queued': {
            where['processing'] = { not_equals: true };
            where['completedAt'] = { exists: false };
            where['hasError'] = { not_equals: true };
            break;
          }
          case 'awaiting_approval': {
            const blockedJobsResult = await payload.find({
              collection: 'blocked-jobs',
              where: {
                status: { equals: 'pending' },
              },
              limit: 0,
            });

            const originalJobIds = blockedJobsResult.docs.map((d) => d.originalJobId);

            if (originalJobIds.length === 0) {
              return {
                docs: [],
                totalDocs: 0,
                limit: input.limit,
                totalPages: 1,
                page: input.page,
                pagingCounter: 1,
                hasPrevPage: false,
                hasNextPage: false,
                prevPage: undefined,
                nextPage: undefined,
              };
            }

            where['id'] = {
              in: originalJobIds,
            };
            break;
          }
        }
      }

      const searchInput = input.search;
      if (typeof searchInput === 'string' && searchInput.length > 0) {
        where.or = [
          {
            id: {
              contains: searchInput,
            },
          },
        ];
      }

      let sort: string | string[] = input.sort;
      const desc = sort.startsWith('-');
      const pureSort = desc ? sort.slice(1) : sort;

      // Whitelist sort fields. Payload might crash on arrays like 'log'.
      if (!['id', 'createdAt', 'status', 'log'].includes(pureSort)) {
        sort = '-createdAt';
      }

      // Determine if we need in-memory sorting
      const isInMemorySort = ['log', 'status'].includes(pureSort);

      // If in-memory sort, we fetch all (with a safe large limit) then sort & paginate in JS
      // Otherwise use DB sort & pagination
      const queryLimit = isInMemorySort ? 1000 : input.limit;
      const queryPage = isInMemorySort ? 1 : input.page;
      const querySort = isInMemorySort ? '-createdAt' : sort; // Default DB sort for in-memory fetch

      const result = await payload.find({
        collection: 'payload-jobs',
        where,
        sort: querySort,
        limit: queryLimit,
        page: queryPage,
      });

      if (!isInMemorySort) {
        // Fetch blocked jobs for the returned docs
        const jobIds = result.docs.map((d) => d.id);
        const blockedJobs = await payload.find({
          collection: 'blocked-jobs',
          where: {
            and: [{ originalJobId: { in: jobIds } }, { status: { equals: 'pending' } }],
          },
          limit: 0,
        });

        // Merge blocked info
        const documents = result.docs.map((document_) => {
          const blocked = blockedJobs.docs.find((bj) => bj.originalJobId === document_.id);
          return {
            ...document_,
            blockedJobId: blocked?.id,
            blockedReason: blocked ? (blocked['reason'] as string | undefined) : undefined,
          };
        });

        return { ...result, docs: documents };
      }

      // --- In-Memory Sorting Logic ---
      const sortedDocuments = [...result.docs].sort((a, b) => {
        let valA: string | number | boolean = '';
        let valB: string | number | boolean = '';

        if (pureSort === 'log') {
          // Sort by Last Step Slug
          const lastLogA = a.log?.at(-1)?.taskSlug ?? '';
          const lastLogB = b.log?.at(-1)?.taskSlug ?? '';
          valA = lastLogA;
          valB = lastLogB;
        } else if (pureSort === 'status') {
          // Sort by Derived Status
          // (Priority: failed > awaiting_approval > completed > processing > queued)
          const getStatusWeight = (job: typeof a): number => {
            const taskKeys = Object.keys(job.taskStatus ?? {});
            const lastTask = taskKeys.at(-1);

            if (job.hasError === true) return 0; // Failed (Highest priority/or grouping)
            if (lastTask === 'blockJob') return 1; // Await Approval
            if (job.completedAt !== undefined && job.completedAt !== null) return 2; // Done
            if (job.processing === true) return 3; // Processing
            return 4; // Queued
          };
          valA = getStatusWeight(a);
          valB = getStatusWeight(b);
        }

        if (valA < valB) return desc ? 1 : -1;
        if (valA > valB) return desc ? -1 : 1;
        return 0;
      });

      // --- Manual Pagination ---
      const startIndex = (input.page - 1) * input.limit;
      const endIndex = startIndex + input.limit;
      const pagedDocuments = sortedDocuments.slice(startIndex, endIndex);

      // Fetch blocked jobs for the returned docs
      const jobIds = pagedDocuments.map((d) => d.id);
      const blockedJobs = await payload.find({
        collection: 'blocked-jobs',
        where: {
          and: [{ originalJobId: { in: jobIds } }, { status: { equals: 'pending' } }],
        },
        limit: 0,
      });

      const documentsWithBlocked = pagedDocuments.map((document_) => {
        const blocked = blockedJobs.docs.find((bj) => bj.originalJobId === document_.id);
        return {
          ...document_,
          blockedJobId: blocked?.id,
          blockedReason: blocked ? (blocked['reason'] as string | undefined) : undefined,
        };
      });

      return {
        ...result,
        docs: documentsWithBlocked,
        totalDocs: result.totalDocs, // Total matches from DB
        limit: input.limit,
        page: input.page,
        totalPages: Math.ceil(result.totalDocs / input.limit),
        pagingCounter: startIndex + 1,
        hasPrevPage: input.page > 1,
        hasNextPage: endIndex < result.totalDocs,
        prevPage: input.page > 1 ? input.page - 1 : undefined,
        nextPage: endIndex < result.totalDocs ? input.page + 1 : undefined,
      };
    }),

  getPendingReviews: adminProcedure.query(async () => {
    const payload = await getPayload({ config });

    const reviews = await payload.find({
      collection: 'blocked-jobs',
      where: {
        status: {
          equals: 'pending',
        },
      },
      sort: '-createdAt',
    });

    return reviews.docs;
  }),

  resolveBlockedJob: adminProcedure
    .input(
      z.object({
        jobId: z.string(),
        resolutionData: z.record(z.unknown()).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const payload = await getPayload({ config });

      const updatedJob = await payload.update({
        collection: 'blocked-jobs',
        id: input.jobId,
        data: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
          status: 'resolved' as any,
          resolutionData: input.resolutionData ?? {},
        },
      });

      return updatedJob;
    }),

  rejectBlockedJob: adminProcedure
    .input(
      z.object({
        jobId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const payload = await getPayload({ config });

      const updatedJob = await payload.update({
        collection: 'blocked-jobs',
        id: input.jobId,
        data: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
          status: 'rejected' as any,
        },
      });

      return updatedJob;
    }),

  restartFailedJob: adminProcedure
    .input(z.object({ jobId: z.string() }))
    .mutation(async ({ input }) => {
      const payload = await getPayload({ config });

      const updatedJob = await payload.update({
        collection: 'payload-jobs',
        id: input.jobId,
        data: {
          hasError: false,
          /* eslint-disable unicorn/no-null, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment */
          error: null as any,
          processing: false,
          completedAt: null as any,
          /* eslint-enable unicorn/no-null, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment */
        },
      });

      return updatedJob;
    }),
});
