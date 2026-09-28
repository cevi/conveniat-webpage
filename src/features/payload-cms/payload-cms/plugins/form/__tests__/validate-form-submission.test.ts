import { validateFormSubmission } from '@/features/payload-cms/payload-cms/plugins/form/hooks/validate-form-submission';
import type { CollectionBeforeChangeHook } from 'payload';

jest.mock('@/utils/auth', () => ({
  auth: jest.fn(() => Promise.resolve()),
}));

// `payload` ships ESM only, which Jest cannot require. The hook needs APIError and nothing else.
jest.mock('payload', () => ({
  APIError: class extends Error {
    public data: unknown;
    public status: number;
    public constructor(message: string, status: number, data: unknown) {
      super(message);
      this.status = status;
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

/** A material order: a list of named lines, behind a condition like the Stadtleben order. */
const materialForm = {
  sections: [
    {
      formSection: {
        fields: [
          { blockType: 'checkbox', name: 'bestellen' },
          {
            blockType: 'conditionedBlock',
            displayCondition: { field: 'bestellen', value: 'true' },
            fields: [
              {
                blockType: 'materialList',
                name: 'holz',
                required: true,
                items: [
                  { id: 'latte', name: 'Dachlatte' },
                  { id: 'brett', name: 'Brett' },
                  { id: 'zelttuch', name: 'Zelttuch', step: 10 },
                ],
              },
            ],
          },
        ],
      },
    },
  ],
};

/** The field errors of a material order, or undefined when it was accepted. */
const materialErrorsOf = async (value: string, bestellen = 'true'): Promise<unknown> => {
  const hookArguments = {
    data: {
      form: 'form-id',
      submissionData: [
        { field: 'bestellen', value: bestellen },
        { field: 'holz', value },
      ],
    },
    operation: 'create',
    req: { payload: { findByID: (): Promise<unknown> => Promise.resolve(materialForm) } },
  } as unknown as Parameters<CollectionBeforeChangeHook>[0];
  try {
    await validateFormSubmission(hookArguments);
    return undefined;
  } catch (error) {
    return (error as { data?: unknown }).data;
  }
};

const order = (...lines: { id: string; quantity: number }[]): string => JSON.stringify(lines);

describe('validateFormSubmission — material list', () => {
  const invalid = [{ field: 'holz', message: 'invalid_number' }];

  it('accepts whole quantities of the listed materials', async () => {
    await expect(
      materialErrorsOf(order({ id: 'latte', quantity: 12 }, { id: 'brett', quantity: 1 })),
    ).resolves.toBeUndefined();
  });

  it('takes a material in its steps, and refuses a quantity off them', async () => {
    await expect(
      materialErrorsOf(order({ id: 'zelttuch', quantity: 30 })),
    ).resolves.toBeUndefined();
    await expect(materialErrorsOf(order({ id: 'zelttuch', quantity: 25 }))).resolves.toEqual(
      invalid,
    );
  });

  it('rejects a material the list does not offer', async () => {
    await expect(materialErrorsOf(order({ id: 'gold', quantity: 1 }))).resolves.toEqual(invalid);
  });

  it.each([-1, 1.5, 10_001])('rejects a quantity of %p', async (quantity) => {
    await expect(materialErrorsOf(order({ id: 'latte', quantity }))).resolves.toEqual(invalid);
  });

  it('rejects an answer that is no material list', async () => {
    await expect(materialErrorsOf('zwölf Latten')).resolves.toEqual(invalid);
  });

  it('asks for a required order', async () => {
    await expect(materialErrorsOf('')).resolves.toEqual([{ field: 'holz', message: 'required' }]);
  });

  it('skips a list the helper never saw', async () => {
    await expect(materialErrorsOf('zwölf Latten', 'false')).resolves.toBeUndefined();
  });
});

describe('validateFormSubmission — a field answered twice', () => {
  it('rejects the submission, so an invalid first answer cannot hide behind a valid one', async () => {
    const hookArguments = {
      data: {
        form: 'form-id',
        submissionData: [
          { field: 'zeitfenster', value: '2027-07-12 – 2027-07-14' },
          { field: 'ressortwunsch', value: 'finanzen' },
          { field: 'ressortwunsch', value: 'infrastruktur' },
        ],
      },
      operation: 'create',
      req: { payload: { findByID: (): Promise<unknown> => Promise.resolve(form) } },
    } as unknown as Parameters<CollectionBeforeChangeHook>[0];

    await expect(validateFormSubmission(hookArguments)).rejects.toMatchObject({
      status: 400,
      data: [{ field: 'ressortwunsch', message: 'invalid_selection' }],
    });
  });
});

/** A plan handed in as a file upload. */
const uploadForm = {
  sections: [{ formSection: { fields: [{ blockType: 'fileUpload', name: 'plan' }] } }],
};

const OWN_FILE = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const SECOND_OWN_FILE = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const FOREIGN_FILE = 'cccccccccccccccccccccccc';
const CLAIMED_FILE = 'dddddddddddddddddddddddd';
const OTHER_FORM_FILE = 'eeeeeeeeeeeeeeeeeeeeeeee';

/** The uploads the database holds, as form_collection stores them. */
const UPLOADS: Record<string, unknown>[] = [
  { id: OWN_FILE, form: 'form-id', isTemporary: true, uploadedBy: 'hof-admin' },
  { id: SECOND_OWN_FILE, form: 'form-id', isTemporary: true, uploadedBy: 'hof-admin' },
  { id: FOREIGN_FILE, form: 'form-id', isTemporary: true, uploadedBy: 'someone-else' },
  { id: CLAIMED_FILE, form: 'form-id', isTemporary: false, uploadedBy: 'hof-admin' },
  { id: OTHER_FORM_FILE, form: 'other-form', isTemporary: true, uploadedBy: 'hof-admin' },
];

type Condition = Record<string, { equals?: unknown; in?: unknown[] }>;

/**
 * Counts the uploads a `where: { and: [...] }` of equals and in conditions matches. Like
 * Mongo, it cannot look up an id that is no ObjectId.
 */
const countUploads = ({
  where,
}: {
  where: { and: Condition[] };
}): Promise<{ totalDocs: number }> =>
  where.and.some(
    (condition) =>
      condition['id']?.in?.some((id) => typeof id !== 'string' || !/^[\da-f]{24}$/i.test(id)) ===
      true,
  )
    ? Promise.reject(new Error('Cast to ObjectId failed'))
    : Promise.resolve({
        totalDocs: UPLOADS.filter((upload) =>
          where.and.every((condition) =>
            Object.entries(condition).every(([key, test]) =>
              test.in === undefined ? upload[key] === test.equals : test.in.includes(upload[key]),
            ),
          ),
        ).length,
      });

/** The one who uploaded most of the files above. */
const HOF_ADMIN = { id: 'hof-admin' };

/** The field errors of a submission naming the given files, or undefined when accepted. */
const uploadErrorsOf = async (
  value: string,
  user: { id: string } | null = HOF_ADMIN,
): Promise<unknown> => {
  const hookArguments = {
    data: { form: 'form-id', submissionData: [{ field: 'plan', value }] },
    operation: 'create',
    req: {
      user,
      payload: {
        findByID: (): Promise<unknown> => Promise.resolve(uploadForm),
        count: countUploads,
      },
    },
  } as unknown as Parameters<CollectionBeforeChangeHook>[0];
  try {
    await validateFormSubmission(hookArguments);
    return undefined;
  } catch (error) {
    return (error as { data?: unknown }).data;
  }
};

describe('validateFormSubmission — file upload', () => {
  const invalid = [{ field: 'plan', message: 'invalid_selection' }];

  it('accepts files the sender uploaded to this form and nobody claimed yet', async () => {
    await expect(uploadErrorsOf(`${OWN_FILE}, ${SECOND_OWN_FILE}`)).resolves.toBeUndefined();
  });

  it("rejects another person's upload, whose id can be guessed", async () => {
    await expect(uploadErrorsOf(`${OWN_FILE}, ${FOREIGN_FILE}`)).resolves.toEqual(invalid);
  });

  it('rejects a file a submission already claimed', async () => {
    await expect(uploadErrorsOf(CLAIMED_FILE)).resolves.toEqual(invalid);
  });

  it('rejects a file uploaded to another form', async () => {
    await expect(uploadErrorsOf(OTHER_FORM_FILE)).resolves.toEqual(invalid);
  });

  it('rejects an answer that is no file id, rather than failing on it', async () => {
    await expect(uploadErrorsOf('null')).resolves.toEqual(invalid);
  });

  it('rejects files named by a signed-out request', async () => {
    // eslint-disable-next-line unicorn/no-null -- Payload reports a request without a session as null
    await expect(uploadErrorsOf(OWN_FILE, null)).resolves.toEqual(invalid);
  });
});
