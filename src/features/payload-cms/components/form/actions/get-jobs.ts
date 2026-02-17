'use server';

import type { Job } from '@/features/payload-cms/payload-types';
import config from '@payload-config';
import { getPayload } from 'payload';

export interface JobWithQuota extends Job {
  availableQuota: number | undefined;
}

export async function getJobs(
  dateRangeCategory: 'setup' | 'main' | 'teardown',
  locale: string,
  category?: string,
): Promise<JobWithQuota[]> {
  const payload = await getPayload({ config });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
  const typedLocale = locale as any;

  const where: { dateRangeCategory: { equals: string }; category?: { equals: string } } = {
    dateRangeCategory: {
      equals: dateRangeCategory,
    },
  };

  if (typeof category === 'string' && category.length > 0) {
    where.category = {
      equals: category,
    };
  }

  const jobs = await payload.find({
    collection: 'jobs',
    where,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    locale: typedLocale,
    depth: 0,
    pagination: false,
  });

  const jobsWithQuota: JobWithQuota[] = await Promise.all(
    jobs.docs.map(async (job) => {
      let availableQuota: number | undefined;
      if (typeof job.maxQuota === 'number') {
        const submissionCount = await payload.count({
          collection: 'form-submissions',
          where: {
            job: {
              equals: job.id,
            },
          },
        });
        availableQuota = Math.max(0, job.maxQuota - submissionCount.totalDocs);
      } else {
        // If no quota is set, it's unlimited. We can represent this as null or Infinity.
        // Using undefined to signify "no limit".
        availableQuota = undefined;
      }

      return {
        ...job,
        availableQuota,
      };
    }),
  );

  return jobsWithQuota;
}
