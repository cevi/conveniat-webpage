import { linkHofSubmission } from '@/features/payload-cms/payload-cms/plugins/form/hooks/link-hof-submission';
import type { FormSubmission } from '@/features/payload-cms/payload-types';
import type { CollectionBeforeChangeHook } from 'payload';

// `payload` ships ESM only, which Jest cannot require. The hook needs APIError and nothing else.
jest.mock('payload', () => ({
  APIError: class extends Error {},
}));

const form = {
  sections: [
    {
      formSection: {
        fields: [
          { blockType: 'text', name: 'standname' },
          {
            blockType: 'conditionedBlock',
            fields: [{ blockType: 'hofSelection', name: 'hof' }],
          },
        ],
      },
    },
  ],
};

const HOEFE: Record<string, { id: string; name: string }> = {
  'hof-nord': { id: 'hof-nord', name: 'Hof Nord' },
};

const run = async (
  submissionData: { field: string; value: string }[],
  operation: 'create' | 'update' = 'create',
  extra: Partial<FormSubmission> = {},
): Promise<Partial<FormSubmission>> => {
  const findByID = jest.fn(({ collection, id }: { collection: string; id: string }) =>
    // eslint-disable-next-line unicorn/no-null -- findByID with disableErrors answers a missing document with null
    Promise.resolve(collection === 'forms' ? form : (HOEFE[id] ?? null)),
  );
  const hookArguments = {
    data: { form: 'form-1', submissionData, ...extra },
    operation,
    req: { payload: { findByID }, locale: 'de' },
  } as unknown as Parameters<CollectionBeforeChangeHook<FormSubmission>>[0];
  return (await linkHofSubmission(hookArguments)) as Partial<FormSubmission>;
};

describe('linkHofSubmission', () => {
  it('links the submission to the chosen Hof and answers with its name', async () => {
    const data = await run([
      { field: 'standname', value: 'Büchsenschiessen' },
      { field: 'hof', value: 'hof-nord' },
    ]);
    expect(data.hof).toBe('hof-nord');
    expect(data.submissionData).toEqual([
      { field: 'standname', value: 'Büchsenschiessen' },
      { field: 'hof', value: 'Hof Nord' },
    ]);
  });

  it('rejects a Hof that does not exist', async () => {
    await expect(run([{ field: 'hof', value: 'hof-unbekannt' }])).rejects.toThrow(
      'Der ausgewählte Hof existiert nicht.',
    );
  });

  it('ignores a Hof sent along with the submission instead of picked in the form', async () => {
    const data = await run([{ field: 'standname', value: 'Büchsenschiessen' }], 'create', {
      hof: 'hof-nord',
    });
    expect(data.hof).toBeUndefined();
  });

  it('leaves a submission without a chosen Hof unlinked', async () => {
    const data = await run([{ field: 'standname', value: 'Büchsenschiessen' }]);
    expect(data.hof).toBeUndefined();
  });

  it('does not relink when a submission is edited', async () => {
    const data = await run([{ field: 'hof', value: 'hof-nord' }], 'update');
    expect(data.hof).toBeUndefined();
  });
});
