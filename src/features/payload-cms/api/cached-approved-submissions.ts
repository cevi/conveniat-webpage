import type { FormSubmission } from '@/features/payload-cms/payload-types';
import { withSpan } from '@/utils/tracing-helpers';
import config from '@payload-config';
import { getPayload } from 'payload';
import { cache } from 'react';

/**
 * Fetches approved form submissions for a specific form ID.
 */
export const getApprovedFormSubmissionsCached = cache(
  async (formId: string): Promise<FormSubmission[]> => {
    return await withSpan('getApprovedFormSubmissionsCached', async () => {
      if (formId === '') return [];

      const payload = await getPayload({ config });

      const result = await payload.find({
        collection: 'form-submissions',
        pagination: false,
        where: {
          and: [{ form: { equals: formId } }, { approved: { equals: true } }],
        },
        sort: '-createdAt',
      });

      return result.docs;
    });
  },
);
