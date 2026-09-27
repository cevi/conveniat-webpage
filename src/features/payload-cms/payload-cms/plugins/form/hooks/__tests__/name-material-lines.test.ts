import { nameMaterialLines } from '@/features/payload-cms/payload-cms/plugins/form/hooks/name-material-lines';
import type { FormSubmission } from '@/features/payload-cms/payload-types';
import type { CollectionBeforeChangeHook } from 'payload';

/** The form as it reads in German: one list up front, one behind a condition. */
const form = {
  sections: [
    {
      formSection: {
        fields: [
          { blockType: 'text', name: 'bemerkungen' },
          {
            blockType: 'materialList',
            name: 'holz',
            items: [
              { id: 'latte', name: 'Dachlatte', section: 'Holz' },
              { id: 'brett', name: 'Brett', section: '' },
            ],
          },
          {
            blockType: 'conditionedBlock',
            fields: [
              {
                blockType: 'materialList',
                name: 'werkzeug',
                items: [{ id: 'spaten', name: 'Spaten', section: 'Werkzeug' }],
              },
            ],
          },
        ],
      },
    },
  ],
};

const findByID = jest.fn(() => Promise.resolve(form));

const run = async (
  submissionData: { field: string; value: string }[],
  operation: 'create' | 'update' = 'create',
): Promise<{ field: string; value: string }[]> => {
  const hookArguments = {
    data: { form: 'form-1', submissionData },
    operation,
    req: { payload: { findByID } },
  } as unknown as Parameters<CollectionBeforeChangeHook<FormSubmission>>[0];
  const data = (await nameMaterialLines(hookArguments)) as Partial<FormSubmission>;
  return data.submissionData ?? [];
};

const valueOf = (answers: { field: string; value: string }[], field: string): unknown => {
  const value = answers.find((answer) => answer.field === field)?.value;
  return value === undefined || value === '' ? value : JSON.parse(value);
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('nameMaterialLines', () => {
  it('stores each ordered line with its German name and section', async () => {
    const answers = await run([
      { field: 'holz', value: JSON.stringify([{ id: 'latte', quantity: 12 }]) },
      { field: 'werkzeug', value: JSON.stringify([{ id: 'spaten', quantity: 2 }]) },
    ]);
    expect(valueOf(answers, 'holz')).toEqual([
      { id: 'latte', name: 'Dachlatte', section: 'Holz', quantity: 12 },
    ]);
    // a list inside a conditioned block is named too
    expect(valueOf(answers, 'werkzeug')).toEqual([
      { id: 'spaten', name: 'Spaten', section: 'Werkzeug', quantity: 2 },
    ]);
    expect(findByID).toHaveBeenCalledWith(expect.objectContaining({ locale: 'de' }));
  });

  it('replaces a name the browser sent with the one the list has', async () => {
    const answers = await run([
      {
        field: 'holz',
        value: JSON.stringify([{ id: 'latte', name: 'Gratis', section: 'Geschenk', quantity: 1 }]),
      },
    ]);
    expect(valueOf(answers, 'holz')).toEqual([
      { id: 'latte', name: 'Dachlatte', section: 'Holz', quantity: 1 },
    ]);
  });

  it('leaves out an empty section and the lines without a quantity', async () => {
    const answers = await run([
      {
        field: 'holz',
        value: JSON.stringify([
          { id: 'brett', quantity: 3 },
          { id: 'latte', quantity: 0 },
        ]),
      },
    ]);
    expect(valueOf(answers, 'holz')).toEqual([{ id: 'brett', name: 'Brett', quantity: 3 }]);
  });

  it('stores an order of nothing as an empty answer', async () => {
    const answers = await run([
      { field: 'holz', value: JSON.stringify([{ id: 'latte', quantity: 0 }]) },
    ]);
    expect(valueOf(answers, 'holz')).toBe('');
  });

  it('leaves the other answers and an answer that is no material list alone', async () => {
    const submissionData = [
      { field: 'bemerkungen', value: '[{"id":"latte","quantity":1}]' },
      { field: 'holz', value: 'not json' },
    ];
    expect(await run(submissionData.map((answer) => ({ ...answer })))).toEqual(submissionData);
  });

  it('does not rename the lines when a submission is edited', async () => {
    const submissionData = [
      { field: 'holz', value: JSON.stringify([{ id: 'latte', quantity: 1 }]) },
    ];
    expect(
      await run(
        submissionData.map((answer) => ({ ...answer })),
        'update',
      ),
    ).toEqual(submissionData);
    expect(findByID).not.toHaveBeenCalled();
  });
});
