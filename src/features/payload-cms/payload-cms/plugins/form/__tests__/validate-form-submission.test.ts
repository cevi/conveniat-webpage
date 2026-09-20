import { validateFormSubmission } from '@/features/payload-cms/payload-cms/plugins/form/hooks/validate-form-submission';
import type { CollectionBeforeChangeHook } from 'payload';

jest.mock('@/utils/auth', () => ({
  auth: jest.fn(() => Promise.resolve()),
}));

// `payload` ships ESM only, which Jest cannot require. The hook needs APIError and nothing else.
jest.mock('payload', () => ({
  APIError: class extends Error {
    public data: unknown;
    public constructor(message: string, _status: number, data: unknown) {
      super(message);
      this.data = data;
    }
  },
}));

/**
 * One availability section, shaped like the "Deine Verfügbarkeit" step of the helper
 * registration: a day range plus the Ressort wish under a name of its own.
 */
const form = {
  sections: [
    {
      formSection: {
        sectionTitle: 'Deine Verfügbarkeit',
        fields: [
          {
            blockType: 'dateSlotSelection',
            name: 'zeitfenster',
            label: 'Von wann bis wann kannst du mithelfen?',
            startDate: '2027-07-12T00:00:00.000Z',
            endDate: '2027-08-15T00:00:00.000Z',
            minDays: 3,
            maxRanges: 1,
            ressortName: 'ressortwunsch',
            ressortLabel: 'In welchem Ressort möchtest du am liebsten mithelfen?',
            required: true,
          },
        ],
      },
    },
  ],
};

/** Runs the hook on a submission that differs only in the wished-for Ressort. */
const submit = async (ressortValue: string): Promise<void> => {
  const hookArguments = {
    data: {
      form: 'form-id',
      submissionData: [
        { field: 'zeitfenster', value: '2027-07-12 – 2027-07-14' },
        { field: 'ressortwunsch', value: ressortValue },
      ],
    },
    operation: 'create',
    req: { payload: { findByID: (): Promise<unknown> => Promise.resolve(form) } },
  } as unknown as Parameters<CollectionBeforeChangeHook>[0];

  await validateFormSubmission(hookArguments);
};

/** The field errors an APIError carries, or undefined when the submission was accepted. */
const errorsOf = async (ressortValue: string): Promise<unknown> => {
  try {
    await submit(ressortValue);
    return undefined;
  } catch (error) {
    return (error as { data?: unknown }).data;
  }
};

describe('validateFormSubmission — Ressort wish', () => {
  it('rejects a Ressort that takes helpers only for a concrete job', async () => {
    const invalid = [{ field: 'ressortwunsch', message: 'invalid_selection' }];

    await expect(errorsOf('finanzen')).resolves.toEqual(invalid);
    await expect(errorsOf('relations')).resolves.toEqual(invalid);
  });

  it('accepts a Ressort the form offers', async () => {
    await expect(errorsOf('infrastruktur')).resolves.toBeUndefined();
  });

  it('rejects a Ressort that does not exist at all', async () => {
    await expect(errorsOf('kein-ressort')).resolves.toEqual([
      { field: 'ressortwunsch', message: 'invalid_selection' },
    ]);
  });
});
