'use server';
import type { HelperJob } from '@/features/payload-cms/payload-types';
import type { Locale } from '@/types/types';
import config from '@payload-config';
import type { Where } from 'payload';
import { getPayload } from 'payload';

// JobWithQuota extends the generated HelperJob type
export interface JobWithQuota extends HelperJob {
  availableQuota?: number | undefined;
}

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
    depth: 1,
  });

  const jobsWithQuota = await Promise.all(
    jobs.map(async (job) => {
      let availableQuota: number | undefined;

      if (typeof job.maxQuota === 'number') {
        const currentSubmissionsCount = await payload.count({
          collection: 'form-submissions',
          where: {
            'helper-job': {
              equals: job.id,
            },
          },
        });
        availableQuota = Math.max(0, job.maxQuota - currentSubmissionsCount.totalDocs);
      }

      return {
        ...job,
        availableQuota,
      } as JobWithQuota;
    }),
  );

  return jobsWithQuota;
};
