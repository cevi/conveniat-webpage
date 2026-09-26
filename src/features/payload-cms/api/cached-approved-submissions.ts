import type { FormSubmission } from '@/features/payload-cms/payload-types';
import { withSpan } from '@/utils/tracing-helpers';
import config from '@payload-config';
import { getPayload } from 'payload';
import { cache } from 'react';

/**
 * Fetches the answers of the approved submissions of one form.
 *
 * Reads with `depth: 0` and selects only `submissionData`. At the default depth the populated
 * form would carry its email and workflow configuration and, through its `submissions` join, other
 * submissions of the same form, approved or not.
 */
export const getApprovedFormSubmissionsCached = cache(
  async (formId: string): Promise<Pick<FormSubmission, 'id' | 'submissionData'>[]> => {
    return await withSpan('getApprovedFormSubmissionsCached', async () => {
      if (formId === '') return [];

      const payload = await getPayload({ config });

      const result = await payload.find({
        collection: 'form-submissions',
        pagination: false,
        depth: 0,
        select: { submissionData: true },
        where: {
          and: [{ form: { equals: formId } }, { approved: { equals: true } }],
        },
        sort: '-createdAt',
      });

      return result.docs;
    });
  },
);
