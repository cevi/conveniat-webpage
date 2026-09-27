jest.mock('@/config/environment-variables', () => ({
  environmentVariables: { FEATURE_ENABLE_HOF_DASHBOARD: true },
}));

import { environmentVariables } from '@/config/environment-variables';
import { recordHofReview } from '@/features/hof-dashboard/payload-cms/hooks/record-hof-review';
import type { FormSubmission } from '@/features/payload-cms/payload-types';
import type { CollectionBeforeChangeHook } from 'payload';

const NOW = '2026-09-27T08:30:00.000Z';

/** A reviewer saving in the admin panel. */
const EDITOR = { id: 'editor-1', fullName: 'Sara Keller', nickname: 'Biber' };

/** A plan Tom sent back for a revision, the one change recorded so far. */
const EARLIER_CHANGE = {
  changedAt: '2026-09-20T10:00:00.000Z',
  reviewerName: 'Tom Frei v/o Dachs',
  reviewer: 'web-2',
  status: 'revisionRequired',
  feedback: 'Masthöhe fehlt',
};
const ORIGINAL = {
  id: 'plan-2',
  hof: 'hof-nord',
  hofReviewStatus: 'revisionRequired',
  hofFeedback: 'Masthöhe fehlt',
  hofReviewLog: [EARLIER_CHANGE],
};

interface Save {
  data: Partial<FormSubmission>;
  user?: object;
  context?: Record<string, unknown>;
  operation?: 'create' | 'update';
}

/** The review history a save leaves on the submission. */
const logAfter = async ({
  data,
  user,
  context = {},
  operation = 'update',
}: Save): Promise<unknown> => {
  const result = (await recordHofReview({
    data: { ...data },
    originalDoc: operation === 'update' ? ORIGINAL : undefined,
    req: { user },
    operation,
    context,
  } as unknown as Parameters<
    CollectionBeforeChangeHook<FormSubmission>
  >[0])) as Partial<FormSubmission>;
  return result.hofReviewLog;
};

beforeEach(() => {
  jest.useFakeTimers({ now: new Date(NOW) });
  (environmentVariables as { FEATURE_ENABLE_HOF_DASHBOARD: boolean }).FEATURE_ENABLE_HOF_DASHBOARD =
    true;
});

afterEach(() => {
  jest.useRealTimers();
});

describe('recordHofReview', () => {
  it('adds who changed the status, when, and what the review reads now', async () => {
    await expect(
      logAfter({ data: { hofReviewStatus: 'accepted' }, user: EDITOR }),
    ).resolves.toEqual([
      EARLIER_CHANGE,
      {
        changedAt: NOW,
        reviewerName: 'Sara Keller v/o Biber',
        reviewer: 'editor-1',
        status: 'accepted',
        // the feedback it kept
        feedback: 'Masthöhe fehlt',
      },
    ]);
  });

  it('records a changed feedback', async () => {
    const log = (await logAfter({
      data: { hofFeedback: 'Danke, passt' },
      user: EDITOR,
    })) as { feedback: string; status: string }[];
    expect(log.at(-1)).toMatchObject({ status: 'revisionRequired', feedback: 'Danke, passt' });
  });

  it('names the reviewer the dashboard passes, which writes without a user', async () => {
    const log = (await logAfter({
      data: { hofReviewStatus: 'inReview', hofFeedback: '' },
      context: { hofReviewer: { id: 'web-3', name: 'Lea Roth v/o Fuchs' } },
    })) as unknown[];
    expect(log.at(-1)).toMatchObject({
      reviewerName: 'Lea Roth v/o Fuchs',
      reviewer: 'web-3',
      status: 'inReview',
      feedback: '',
    });
  });

  it('adds nothing when a save changes neither status nor feedback', async () => {
    await expect(
      logAfter({
        data: { hofReviewStatus: 'revisionRequired', hofFeedback: 'Masthöhe fehlt' },
        user: EDITOR,
      }),
    ).resolves.toBeUndefined();
    await expect(logAfter({ data: {}, user: EDITOR })).resolves.toBeUndefined();
  });

  it('records nothing when a Hof hands a form in', async () => {
    await expect(
      logAfter({ data: { hofReviewStatus: 'accepted' }, user: EDITOR, operation: 'create' }),
    ).resolves.toBeUndefined();
  });

  it('records nothing on a deployment without the Hof dashboard', async () => {
    (
      environmentVariables as { FEATURE_ENABLE_HOF_DASHBOARD: boolean }
    ).FEATURE_ENABLE_HOF_DASHBOARD = false;
    await expect(
      logAfter({ data: { hofReviewStatus: 'accepted' }, user: EDITOR }),
    ).resolves.toBeUndefined();
  });
});
