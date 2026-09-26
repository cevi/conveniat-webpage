'use server';
import type { HelperJob } from '@/features/payload-cms/payload-types';
import type { Locale } from '@/types/types';
import config from '@payload-config';
import type { Where } from 'payload';
import { getPayload } from 'payload';

/**
 * What the helper form shows of a job, and nothing more.
 *
 * `getJobs` is a server action, so anyone can call it without logging in. A helper job joins its
 * form submissions, and returning the whole document handed every caller the registrations,
 * approval tokens and delivery reports of everyone who signed up. Keep this list to fields that
 * are safe to publish.
 */
export type JobWithQuota = Pick<
  HelperJob,
  'id' | 'title' | 'description' | 'category' | 'dateRange'
> & {
  availableQuota?: number | undefined;
};

/**
 * Lists the published helper jobs of one phase for the helper form, with the spots still free.
 */
export const getJobs = async (
  dateRangeCategory: 'setup' | 'main' | 'teardown',
  locale: Locale,
  category?: string | null,
): Promise<JobWithQuota[]> => {
  const payload = await getPayload({ config });

  const where: Where = {
    dateRangeCategory: {
      equals: dateRangeCategory,
    },
    _localized_status: { equals: { published: true } },
  };

  if (typeof category === 'string' && category !== 'all') {
    where['category'] = {
      equals: category,
    };
  }

  const { docs: jobs } = await payload.find({
    collection: 'helper-jobs',
    where,
    locale,
    limit: 1000,
    depth: 0,
    select: {
      title: true,
      description: true,
      category: true,
      dateRange: true,
      maxQuota: true,
    },
  });

  const jobsWithQuota = await Promise.all(
    jobs.map(async (job) => {
      let availableQuota: number | undefined;

      if (typeof job.maxQuota === 'number') {
        const currentSubmissionsCount = await payload.count({
          collection: 'form-submissions',
          where: {
            'helper-jobs': {
              contains: job.id,
            },
          },
        });
        availableQuota = Math.max(0, job.maxQuota - currentSubmissionsCount.totalDocs);
      }

      // built field by field, so a field added to the query later is not published by accident
      return {
        id: job.id,
        title: job.title,
        description: job.description,
        category: job.category,
        dateRange: job.dateRange,
        availableQuota,
      };
    }),
  );

  return jobsWithQuota;
};
