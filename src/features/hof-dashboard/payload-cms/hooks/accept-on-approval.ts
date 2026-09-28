import { environmentVariables } from '@/config/environment-variables';
import type { FormSubmission } from '@/features/payload-cms/payload-types';
import type { CollectionBeforeChangeHook } from 'payload';

/**
 * Approving a Hof's submission accepts it, the same wherever it is given: "Freigegeben" on the
 * dashboard, the checkbox in the admin panel, or the approval link of an email. The dashboard
 * clears the Ressort's working status when it accepts; this does it for the other two, so taking
 * an approval back leaves the submission handed in rather than in a status from before.
 */
export const acceptOnApproval: CollectionBeforeChangeHook<FormSubmission> = ({
  data,
  originalDoc,
  operation,
}) => {
  if (operation !== 'update' || !environmentVariables.FEATURE_ENABLE_HOF_DASHBOARD) return data;
  const hof = 'hof' in data ? data.hof : originalDoc?.hof;
  if (hof === undefined || hof === null || hof === '') return data;
  if (data.approved === true && originalDoc?.approved !== true) {
    // eslint-disable-next-line unicorn/no-null -- Payload clears a select only with null
    data.hofReviewStatus = null;
  }
  return data;
};
