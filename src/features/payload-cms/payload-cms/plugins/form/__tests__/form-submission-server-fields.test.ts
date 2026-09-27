jest.mock('@/config/environment-variables', () => ({ environmentVariables: {} }));

// `payload` ships ESM only, which Jest cannot require. The hook needs APIError and nothing else.
jest.mock('payload', () => ({
  APIError: class extends Error {},
}));

import {
  helperJobsField,
  smtpResultsField,
  workflowResultsField,
} from '@/features/payload-cms/payload-cms/plugins/form/form-submission-server-fields';
import { linkJobSubmission } from '@/features/payload-cms/payload-cms/plugins/form/hooks/link-job-submission';
import type { FormSubmission } from '@/features/payload-cms/payload-types';
import type { CollectionBeforeChangeHook, Field, FieldAccess, PayloadRequest } from 'payload';

type Submission = Partial<FormSubmission> & Record<string, unknown>;

const SERVER_FIELDS: Record<string, Field> = {
  smtpResults: smtpResultsField,
  workflowResults: workflowResultsField,
  'helper-jobs': helperJobsField,
};

/** A web core team member, who edits submissions in the admin panel. */
const EDITOR = { id: 'editor', groups: [{ id: 105 }] };

const FORMS: Record<string, unknown> = {
  'form-plain': {
    sections: [{ formSection: { fields: [{ blockType: 'text', name: 'vorname' }] } }],
  },
  'form-with-jobs': {
    sections: [{ formSection: { fields: [{ blockType: 'jobSelection', name: 'job' }] } }],
  },
};

const JOBS: Record<string, { id: string; title: string; maxQuota: number }> = {
  'job-kitchen': { id: 'job-kitchen', title: 'Küche', maxQuota: 5 },
  'job-full': { id: 'job-full', title: 'Aufbau', maxQuota: 1 },
};

const accessOf = (name: string, operation: 'create' | 'update'): FieldAccess => {
  const field = SERVER_FIELDS[name];
  const access = field !== undefined && 'access' in field ? field.access[operation] : undefined;
  if (access === undefined) throw new Error(`${name} declares no ${operation} access`);
  return access;
};

/**
 * Hands a submission in the way POST /api/form-submissions does: Payload drops each field whose
 * create access says no (fields/hooks/beforeValidate/promise.js), and only then runs the
 * collection's beforeChange hooks (collections/operations/create.js).
 */
const handIn = async (data: Submission): Promise<Submission> => {
  const request = {
    locale: 'de',
    user: undefined,
    payload: {
      findByID: ({ collection, id }: { collection: string; id: string }): Promise<unknown> => {
        const document_ = collection === 'forms' ? FORMS[id] : JOBS[id];
        return document_ === undefined
          ? Promise.reject(new Error('not found'))
          : Promise.resolve(document_);
      },
      count: ({ where }: { where: { 'helper-jobs': { contains: string } } }) =>
        Promise.resolve({ totalDocs: where['helper-jobs'].contains === 'job-full' ? 1 : 0 }),
    },
  } as unknown as PayloadRequest;

  for (const name of Object.keys(SERVER_FIELDS)) {
    if (!(await accessOf(name, 'create')({ req: request, data }))) delete data[name];
  }

  return (await linkJobSubmission({
    data,
    operation: 'create',
    req: request,
  } as unknown as Parameters<CollectionBeforeChangeHook<FormSubmission>>[0])) as Submission;
};

const FORGED = {
  'helper-jobs': ['job-full', 'job-kitchen'],
  smtpResults: [{ success: true, to: 'erika.beispiel@example.com' }],
  workflowResults: [{ workflow: 'brevoContactWorkflow', status: 'success' }],
};

describe('a submission handed in over the API', () => {
  it('drops job links and results the sender made up', async () => {
    const submission = await handIn({
      form: 'form-plain',
      submissionData: [{ field: 'vorname', value: 'Erika' }],
      ...FORGED,
    });

    expect(submission['helper-jobs']).toBeUndefined();
    expect(submission.smtpResults).toBeUndefined();
    expect(submission.workflowResults).toBeUndefined();
  });

  it('links the job picked in the form, not the ones sent along with it', async () => {
    const submission = await handIn({
      form: 'form-with-jobs',
      submissionData: [{ field: 'job', value: 'job-kitchen' }],
      ...FORGED,
    });

    expect(submission['helper-jobs']).toEqual(['job-kitchen']);
    expect(submission.submissionData).toEqual([{ field: 'job', value: 'Küche' }]);
  });
});

// the admin panel shows them read-only; an editor's save keeps what the server wrote
it.each(Object.keys(SERVER_FIELDS))('lets no editor change %s', async (name) => {
  const request = { user: EDITOR } as unknown as PayloadRequest;
  await expect(Promise.resolve(accessOf(name, 'update')({ req: request }))).resolves.toBe(false);
});
