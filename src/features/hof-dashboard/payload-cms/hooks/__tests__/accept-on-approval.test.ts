jest.mock('@/config/environment-variables', () => ({
  environmentVariables: { FEATURE_ENABLE_HOF_DASHBOARD: true },
}));

import { acceptOnApproval } from '@/features/hof-dashboard/payload-cms/hooks/accept-on-approval';
import type { FormSubmission } from '@/features/payload-cms/payload-types';

type Stored = Partial<FormSubmission> & Record<string, unknown>;

const save = (data: Stored, stored: Stored): Stored =>
  (acceptOnApproval as unknown as (args: Record<string, unknown>) => Stored)({
    data: { ...data },
    originalDoc: stored,
    operation: 'update',
  });

/** A Hof's plan the Ressort is looking at. */
const IN_REVIEW: Stored = { hof: 'hof-uster', approved: false, hofReviewStatus: 'inReview' };

describe('acceptOnApproval', () => {
  it('clears the working status when an approval accepts a Hof submission', () => {
    // what the approval link and the admin checkbox send: only the approval
    expect(save({ approved: true }, IN_REVIEW)).toEqual({
      approved: true,
      // eslint-disable-next-line unicorn/no-null -- Payload clears a select only with null
      hofReviewStatus: null,
    });
  });

  it('leaves the status of a submission that was approved already', () => {
    const approved = { ...IN_REVIEW, approved: true };
    expect(save({ approved: true, hofFeedback: 'Danke' }, approved)).toEqual({
      approved: true,
      hofFeedback: 'Danke',
    });
  });

  it('leaves the status when the approval is taken back', () => {
    expect(save({ approved: false }, { ...IN_REVIEW, approved: true })).toEqual({
      approved: false,
    });
  });

  it('leaves a submission of no Hof alone', () => {
    expect(save({ approved: true }, { approved: false })).toEqual({ approved: true });
  });
});
