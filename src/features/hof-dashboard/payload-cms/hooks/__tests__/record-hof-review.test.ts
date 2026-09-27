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

/** A submission as Payload stores it, with room for fields the test leaves out. */
type Stored = Partial<FormSubmission> & Record<string, unknown>;

/** A plan Tom sent back for a revision, the one change recorded so far. */
const EARLIER_CHANGE = {
  changedAt: '2026-09-20T10:00:00.000Z',
  reviewerName: 'Tom Frei v/o Dachs',
  reviewer: 'web-2',
  status: 'revisionRequired' as const,
  feedback: 'Masthöhe fehlt',
};
const ORIGINAL: Stored = {
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
  original?: Stored;
}

/** The review history a save leaves on the submission. */
const logAfter = async ({
  data,
  user,
  context = {},
  operation = 'update',
  original = ORIGINAL,
}: Save): Promise<unknown> => {
  const result = (await recordHofReview({
    data: { ...data },
    originalDoc: operation === 'update' ? original : undefined,
    // Payload answers a local API call without a user with null
    // eslint-disable-next-line unicorn/no-null
    req: { user: user ?? null },
    operation,
    context,
  } as unknown as Parameters<
    CollectionBeforeChangeHook<FormSubmission>
  >[0])) as Partial<FormSubmission>;
  return result.hofReviewLog;
};

/** The one line a save added to the history. */
const addedLine = async (save: Save): Promise<unknown> => {
  const log = (await logAfter(save)) as unknown[] | undefined;
  return log?.at(-1);
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
  it('adds who accepted it, when, and what the review reads now', async () => {
    await expect(
      // eslint-disable-next-line unicorn/no-null -- the dashboard clears the status on accepting
      logAfter({ data: { approved: true, hofReviewStatus: null }, user: EDITOR }),
    ).resolves.toEqual([
      EARLIER_CHANGE,
      {
        changedAt: NOW,
        reviewerName: 'Sara Keller v/o Biber',
        reviewer: 'editor-1',
        // accepted is the form builder's approval
        status: 'accepted',
        // the feedback it kept
        feedback: 'Masthöhe fehlt',
        final: false,
      },
    ]);
  });

  it('records an approval ticked in the admin panel, whatever status is left next to it', async () => {
    await expect(addedLine({ data: { approved: true }, user: EDITOR })).resolves.toMatchObject({
      status: 'accepted',
    });
  });

  it('records an approval through the link of an email, which has no reviewer to point at', async () => {
    await expect(
      addedLine({
        data: { approved: true },
        context: { hofReviewer: { id: '', name: 'Freigabe-Link (E-Mail)' } },
      }),
    ).resolves.toEqual({
      changedAt: NOW,
      reviewerName: 'Freigabe-Link (E-Mail)',
      // eslint-disable-next-line unicorn/no-null -- Payload stores an empty relationship as null
      reviewer: null,
      status: 'accepted',
      feedback: 'Masthöhe fehlt',
      final: false,
    });
  });

  it('records taking an approval back as the status left under it', async () => {
    // eslint-disable-next-line unicorn/no-null -- accepting cleared the status
    const approved: Stored = { ...ORIGINAL, approved: true, hofReviewStatus: null };
    await expect(
      addedLine({ data: { approved: false }, user: EDITOR, original: approved }),
    ).resolves.toMatchObject({
      // eslint-disable-next-line unicorn/no-null -- a cleared select is stored as null
      status: null,
      feedback: 'Masthöhe fehlt',
    });
    await expect(
      addedLine({
        data: { approved: false, hofReviewStatus: 'inReview' },
        user: EDITOR,
        original: approved,
      }),
    ).resolves.toMatchObject({ status: 'inReview' });
  });

  it('records marking a version final, and taking the mark back', async () => {
    await expect(addedLine({ data: { hofFinal: true }, user: EDITOR })).resolves.toMatchObject({
      status: 'revisionRequired',
      final: true,
    });
    await expect(
      addedLine({
        data: { hofFinal: false },
        user: EDITOR,
        original: { ...ORIGINAL, hofFinal: true },
      }),
    ).resolves.toMatchObject({ final: false });
  });

  it('records a changed feedback', async () => {
    await expect(
      addedLine({ data: { hofFeedback: 'Danke, passt' }, user: EDITOR }),
    ).resolves.toMatchObject({ status: 'revisionRequired', feedback: 'Danke, passt' });
  });

  it('names the reviewer the dashboard passes, which writes without a user', async () => {
    await expect(
      addedLine({
        data: { hofReviewStatus: 'inReview', hofFeedback: '' },
        context: { hofReviewer: { id: 'web-3', name: 'Lea Roth v/o Fuchs' } },
      }),
    ).resolves.toMatchObject({
      reviewerName: 'Lea Roth v/o Fuchs',
      reviewer: 'web-3',
      status: 'inReview',
      feedback: '',
    });
  });

  it('adds nothing when a save changes neither answer, feedback nor final mark', async () => {
    await expect(
      logAfter({
        data: {
          hofReviewStatus: 'revisionRequired',
          hofFeedback: 'Masthöhe fehlt',
          hofFinal: false,
        },
        user: EDITOR,
      }),
    ).resolves.toBeUndefined();
    await expect(logAfter({ data: {}, user: EDITOR })).resolves.toBeUndefined();
    // approving an approved submission again, as a second click on the link does
    await expect(
      logAfter({
        data: { approved: true },
        context: { hofReviewer: { id: '', name: 'Freigabe-Link (E-Mail)' } },
        original: { ...ORIGINAL, approved: true },
      }),
    ).resolves.toBeUndefined();
  });

  it('records nothing for a submission of no Hof, like one approved for the website', async () => {
    const withoutHof = { id: 'contact-1', approved: false };
    await expect(
      logAfter({ data: { approved: true }, user: EDITOR, original: withoutHof }),
    ).resolves.toBeUndefined();
  });

  it('records nothing when a Hof hands a form in', async () => {
    await expect(
      logAfter({ data: { approved: true }, user: EDITOR, operation: 'create' }),
    ).resolves.toBeUndefined();
  });

  it('records nothing on a deployment without the Hof dashboard', async () => {
    (
      environmentVariables as { FEATURE_ENABLE_HOF_DASHBOARD: boolean }
    ).FEATURE_ENABLE_HOF_DASHBOARD = false;
    await expect(logAfter({ data: { approved: true }, user: EDITOR })).resolves.toBeUndefined();
  });
});
