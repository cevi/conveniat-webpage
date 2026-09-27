jest.mock('@/config/environment-variables', () => ({
  environmentVariables: {
    FEATURE_ENABLE_HOF_DASHBOARD: true,
    CEVIDB_GROUP_FULL_ADMIN: [541],
    CEVIDB_GROUP_WEB_CORE_TEAM: [105],
    CEVIDB_GROUP_TRANSLATION_TEAM: [106],
    CEVIDB_GROUP_PROGRAM_TEAM: [107],
    CEVIDB_GROUP_MATERIAL_TEAM: [108],
  },
}));

import { formSubmissionReviewFields } from '@/features/hof-dashboard/payload-cms/form-submission-review-fields';
import type { FieldAccess, PayloadRequest } from 'payload';

/** A web core team member reviews what the Höfe hand in. */
const REVIEWER = { id: 'reviewer', groups: [{ id: 105 }] };
/** A camp participant, who may hand a form in but not answer it. */
const PARTICIPANT = { id: 'participant', groups: [{ id: 4242 }] };

const accessOf = (name: string, operation: 'read' | 'create' | 'update'): FieldAccess => {
  const field = formSubmissionReviewFields.find(
    (candidate) => 'name' in candidate && candidate.name === name,
  );
  const access = field !== undefined && 'access' in field ? field.access[operation] : undefined;
  if (access === undefined) throw new Error(`${name} declares no ${operation} access`);
  return access;
};

const allows = (access: FieldAccess, user: object): Promise<boolean> =>
  Promise.resolve(access({ req: { user } as unknown as PayloadRequest }));

describe.each(['hofReviewStatus', 'hofFeedback'])('%s', (name) => {
  it.each(['create', 'update'] as const)('lets a reviewer %s it', async (operation) => {
    await expect(allows(accessOf(name, operation), REVIEWER)).resolves.toBe(true);
  });

  // anyone may hand a form in: a status sent along with it would accept itself
  it.each(['create', 'update'] as const)(
    'drops it when a participant tries to %s it',
    async (operation) => {
      await expect(allows(accessOf(name, operation), PARTICIPANT)).resolves.toBe(false);
    },
  );
});

describe('hofReviewLog', () => {
  it('shows the review history to a reviewer', async () => {
    await expect(allows(accessOf('hofReviewLog', 'read'), REVIEWER)).resolves.toBe(true);
  });

  it('keeps the review history from a Hof', async () => {
    await expect(allows(accessOf('hofReviewLog', 'read'), PARTICIPANT)).resolves.toBe(false);
  });

  // only recordHofReview writes it, so nobody can rewrite who said what
  it.each(['create', 'update'] as const)(
    'lets nobody %s it, a reviewer neither',
    async (operation) => {
      await expect(allows(accessOf('hofReviewLog', operation), REVIEWER)).resolves.toBe(false);
      await expect(allows(accessOf('hofReviewLog', operation), PARTICIPANT)).resolves.toBe(false);
    },
  );
});
