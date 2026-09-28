import { HOF_ADMINISTRATOR_ROLE_CLASS } from '@/features/payload-cms/payload-cms/access-rules/hof-administrator-role';

const PAST = '2020-01-31T10:00:00.000Z';
const FUTURE = '2999-01-31T10:00:00.000Z';

const published = { published: true };

/** A plan handed in as versions: only the newest counts, and it closes at its due date. */
const planForm = {
  id: 'form-plan',
  title: 'Hofbauten (Formular)',
  _localized_status: published,
  hofDashboard: {
    area: 'infrastructure',
    entries: 'versions',
    title: 'Hofbauten',
    description: 'Plan der Hofbauten',
    deadline: PAST,
    closesAtDeadline: true,
    position: 2,
  },
  sections: [
    {
      formSection: {
        fields: [
          { blockType: 'message', message: {} },
          { blockType: 'hofSelection', name: 'hof', label: 'Hof' },
          { blockType: 'fileUpload', name: 'plan', label: 'Plan' },
          {
            blockType: 'conditionedBlock',
            fields: [
              // the form builder writes a checkbox's label as rich text
              {
                blockType: 'checkbox',
                name: 'strom',
                label: {
                  root: {
                    type: 'root',
                    children: [
                      {
                        type: 'paragraph',
                        children: [
                          { type: 'text', text: 'Stromanschluss (siehe ' },
                          { type: 'link', children: [{ type: 'text', text: 'Leitungsplan' }] },
                          { type: 'text', text: ')' },
                        ],
                      },
                      { type: 'paragraph', children: [] },
                    ],
                  },
                },
              },
              {
                blockType: 'select',
                name: 'dach',
                label: 'Dach',
                options: [
                  { value: 'blache', label: 'Blache' },
                  { value: 'holz', label: 'Holz' },
                ],
              },
            ],
          },
          { blockType: 'text', name: 'bemerkungen', label: 'Bemerkungen' },
        ],
      },
    },
  ],
};

/** Stands of the Stadtleben: every submission counts on its own, named by one answer. */
const standForm = {
  id: 'form-stand',
  title: 'Stadtleben',
  _localized_status: published,
  hofDashboard: { area: 'program', entries: 'entries', titleField: 'stand', position: 1 },
  sections: [
    {
      formSection: {
        fields: [
          { blockType: 'hofSelection', name: 'hof', label: 'Hof' },
          { blockType: 'text', name: 'stand', label: 'Stand' },
        ],
      },
    },
  ],
};

/** A material order past its due date that stays open. */
const materialForm = {
  id: 'form-material',
  title: 'Material',
  _localized_status: published,
  hofDashboard: {
    area: 'material',
    entries: 'versions',
    deadline: PAST,
    closesAtDeadline: false,
    position: 3,
  },
  sections: [
    {
      formSection: {
        fields: [
          { blockType: 'hofSelection', name: 'hof', label: 'Hof' },
          {
            blockType: 'materialList',
            name: 'holz',
            label: 'Holz',
            items: [{ id: 'latte' }, { id: 'brett' }],
          },
        ],
      },
    },
  ],
};

/** Not published in this language, so the dashboard does not offer it. */
const draftForm = {
  id: 'form-draft',
  title: 'Entwurf',
  _localized_status: { published: false },
  hofDashboard: { area: 'program', entries: 'versions', deadline: FUTURE },
  sections: [{ formSection: { fields: [{ blockType: 'hofSelection', name: 'hof' }] } }],
};

const materialAnswer = (quantity: number): string =>
  JSON.stringify([{ id: 'latte', name: 'Dachlatte', section: 'Holz', quantity }]);

/** The Hof's submissions, newest first, as the query sorts them. */
const SUBMISSIONS = [
  {
    id: 'plan-2',
    form: 'form-plan',
    createdAt: '2026-09-20T10:00:00.000Z',
    submissionData: [
      { field: 'hof', value: 'Hof Nord' },
      { field: 'bemerkungen', value: 'Neu mit Dach' },
      // file-foreign belongs to a submission of another Hof, and anyone can write its id here
      { field: 'plan', value: 'file-a, file-gone, file-foreign' },
      { field: 'strom', value: 'true' },
      { field: 'dach', value: 'holz' },
    ],
  },
  {
    id: 'stand-b',
    form: 'form-stand',
    createdAt: '2026-09-19T10:00:00.000Z',
    submissionData: [{ field: 'stand', value: 'Crêpes' }],
    approved: true,
    // the website approval counts, whatever the Ressort's status says
    hofReviewStatus: 'revisionRequired',
  },
  {
    id: 'material-2',
    form: 'form-material',
    createdAt: '2026-09-18T10:00:00.000Z',
    submissionData: [{ field: 'holz', value: materialAnswer(12) }],
    hofReviewStatus: 'revisionRequired',
    hofFeedback: 'Zu viele Latten',
    // Sara asked first, Tom replaced her feedback, then Sara only changed the status
    hofReviewLog: [
      {
        changedAt: '2026-09-18T12:00:00.000Z',
        reviewerName: 'Sara Keller v/o Biber',
        status: 'inReview',
        feedback: 'Bitte Latten zählen',
      },
      {
        changedAt: '2026-09-19T12:00:00.000Z',
        reviewerName: 'Tom Frei v/o Dachs',
        status: 'inReview',
        feedback: 'Zu viele Latten',
      },
      {
        changedAt: '2026-09-20T12:00:00.000Z',
        reviewerName: 'Sara Keller v/o Biber',
        status: 'revisionRequired',
        feedback: 'Zu viele Latten',
      },
    ],
  },
  {
    id: 'stand-a',
    form: 'form-stand',
    createdAt: '2026-09-15T10:00:00.000Z',
    submissionData: [{ field: 'stand', value: 'Büchsenschiessen' }],
  },
  {
    id: 'plan-1',
    form: 'form-plan',
    createdAt: '2026-09-10T10:00:00.000Z',
    submissionData: [
      { field: 'bemerkungen', value: 'Erster Entwurf' },
      // names a file of the newer version: it shows there, not here
      { field: 'plan', value: 'file-a' },
    ],
  },
  {
    id: 'material-1',
    form: 'form-material',
    createdAt: '2026-09-01T10:00:00.000Z',
    submissionData: [{ field: 'holz', value: materialAnswer(4) }],
    hofReviewStatus: 'inReview',
    // feedback written and taken back again: nobody's feedback shows
    hofReviewLog: [
      {
        changedAt: '2026-09-02T12:00:00.000Z',
        reviewerName: 'Tom Frei v/o Dachs',
        status: 'inReview',
        feedback: 'Fehlt da nicht etwas?',
      },
      {
        changedAt: '2026-09-03T12:00:00.000Z',
        reviewerName: 'Tom Frei v/o Dachs',
        // eslint-disable-next-line unicorn/no-null -- Payload stores a cleared select as null
        status: null,
        feedback: '',
      },
    ],
  },
];

/** Users who signed in: the login keeps their Cevi.DB roles. Hof Nord is the group 990001. */
const USERS = [
  {
    fullName: 'Anna Beispiel',
    nickname: 'Fuchs',
    email: 'anna@example.com',
    groups: [{ id: 990_001, role_class: HOF_ADMINISTRATOR_ROLE_CLASS }],
  },
  {
    fullName: 'Lea Roth',
    // eslint-disable-next-line unicorn/no-null -- Payload stores a missing Cevi name as null
    nickname: null,
    email: 'lea@example.com',
    groups: [{ id: 990_001, role_class: HOF_ADMINISTRATOR_ROLE_CLASS }],
  },
  {
    // only a member of Hof Nord; the address manager of Hof Süd
    fullName: 'Max Muster',
    nickname: 'Dachs',
    email: 'max@example.com',
    groups: [
      { id: 990_001, role_class: 'Group::MitgliederorganisationExterne::Externer' },
      { id: 990_002, role_class: HOF_ADMINISTRATOR_ROLE_CLASS },
    ],
  },
  {
    // the address manager of a Jungschar with the same id, not of the Hof's group
    fullName: 'Jan Keller',
    nickname: 'Igel',
    email: 'jan@example.com',
    groups: [{ id: 990_001, role_class: 'Group::Jungschar::Adressverwalter' }],
  },
];

const STORED_FILES = [
  {
    id: 'file-a',
    originalFilename: 'Plan.pdf',
    filename: 'Plan-1a2b.pdf',
    filesize: 2048,
    formSubmission: 'plan-2',
  },
  {
    id: 'file-foreign',
    originalFilename: 'Fremd.pdf',
    filename: 'Fremd.pdf',
    filesize: 1024,
    formSubmission: 'other-hof-plan',
  },
];

interface FileQuery {
  and: [{ id: { in: string[] } }, { formSubmission: { in: string[] } }];
}

let mockForms: unknown[] = [];
let mockSubmissions: Record<string, unknown>[] = SUBMISSIONS;
let mockUsers: unknown[] = USERS;
/** The Hof's addresses the billing sync copied from its Cevi.DB group. */
let mockAddressManagerEmails: string | undefined;
let mockAddressManagers: Array<{ name?: string | null; email: string }> | undefined;
/** The forms as read in German, when that differs from the reader's language. */
let mockGermanForms: unknown[] | undefined;

const mockPayload = {
  find: jest.fn(
    ({ collection, where, locale }: { collection: string; where?: FileQuery; locale?: string }) => {
      switch (collection) {
        case 'forms': {
          const forms = locale === 'de' ? (mockGermanForms ?? mockForms) : mockForms;
          return Promise.resolve({ docs: forms, totalDocs: forms.length });
        }
        case 'form-submissions': {
          return Promise.resolve({ docs: mockSubmissions, totalDocs: mockSubmissions.length });
        }
        case 'users': {
          return Promise.resolve({ docs: mockUsers, totalDocs: mockUsers.length });
        }
        case 'form_collection': {
          const [ids, submissions] = where?.and ?? [];
          const files = STORED_FILES.filter(
            (file) =>
              ids?.id.in.includes(file.id) === true &&
              submissions?.formSubmission.in.includes(file.formSubmission) === true,
          );
          return Promise.resolve({ docs: files, totalDocs: files.length });
        }
        default: {
          return Promise.resolve({ docs: [], totalDocs: 0 });
        }
      }
    },
  ),
  findByID: jest.fn(() =>
    Promise.resolve({
      id: 'hof-nord',
      name: 'Hof Nord',
      groupId: '990001',
      addressManagerEmails: mockAddressManagerEmails,
      addressManagers: mockAddressManagers,
    }),
  ),
  findGlobal: jest.fn(() =>
    Promise.resolve({
      deadlines: [
        { id: 'later', date: '2027-05-31T10:00:00.000Z', title: 'Feinkonzept', area: 'program' },
        {
          id: 'first',
          date: '2027-01-31T10:00:00.000Z',
          title: 'Grobkonzept',
          area: 'infrastructure',
        },
      ],
      documents: [
        {
          document: { id: 'doc-1', title: 'Merkblatt', url: '/m.pdf', filesize: 100 },
          area: 'infrastructure',
        },
        // a document whose file is gone has nothing to download
        { document: { id: 'doc-2', title: 'Ohne Datei' } },
      ],
    }),
  ),
};

// the access rules read the Cevi.DB groups of the Ressorts from the environment
jest.mock('@/config/environment-variables', () => ({
  environmentVariables: { FEATURE_ENABLE_HOF_DASHBOARD: true },
}));
jest.mock('@payload-config', () => ({ default: {} }), { virtual: true });
jest.mock('payload', () => ({ getPayload: (): Promise<unknown> => Promise.resolve(mockPayload) }));
jest.mock('@/utils/server-logger', () => ({
  createLogger: (): Record<string, jest.Mock> => ({ debug: jest.fn(), warn: jest.fn() }),
}));

import {
  getHofDashboardData,
  type HofDashboardForm,
} from '@/features/hof-dashboard/api/hof-dashboard-data';
import { summarizeHofSubmission } from '@/features/hof-dashboard/api/hof-submission-summary';

const formOf = async (formId: string, isReviewer = false): Promise<HofDashboardForm> => {
  const { forms } = await getHofDashboardData('hof-nord', 'de', isReviewer);
  const form = forms.find((candidate) => candidate.id === formId);
  if (form === undefined) throw new Error(`${formId} is not on the dashboard`);
  return form;
};

const closedOf = async (formId: string, isReviewer = false): Promise<boolean> => {
  const form = await formOf(formId, isReviewer);
  return form.closed;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockForms = [planForm, standForm, materialForm, draftForm];
  mockGermanForms = undefined;
  mockSubmissions = SUBMISSIONS;
  mockUsers = USERS;
  mockAddressManagerEmails = undefined;
  mockAddressManagers = undefined;
});

/** The Hof's submissions with one of them changed. */
const withSubmission = (id: string, change: Record<string, unknown>): Record<string, unknown>[] =>
  SUBMISSIONS.map((submission) =>
    submission.id === id ? { ...submission, ...change } : submission,
  );

describe('getHofDashboardData', () => {
  it('offers the published forms in their position order, under their dashboard title', async () => {
    const { forms } = await getHofDashboardData('hof-nord', 'de', false);
    expect(forms.map((form) => [form.id, form.title, form.area])).toEqual([
      ['form-stand', 'Stadtleben', 'program'],
      ['form-plan', 'Hofbauten', 'infrastructure'],
      ['form-material', 'Material', 'material'],
    ]);
  });

  it('reads only the submissions of the Hof it shows', async () => {
    await getHofDashboardData('hof-nord', 'de', false);
    const query = mockPayload.find.mock.calls
      .map(([options]) => options)
      .find((options) => options.collection === 'form-submissions') as unknown as {
      where: { and: unknown[] };
    };
    expect(query.where.and).toContainEqual({ hof: { equals: 'hof-nord' } });
  });

  it('reads no submissions when no form is linked', async () => {
    mockForms = [draftForm];
    const { forms } = await getHofDashboardData('hof-nord', 'de', false);
    expect(forms).toEqual([]);
    expect(mockPayload.find).not.toHaveBeenCalledWith(
      expect.objectContaining({ collection: 'form-submissions' }),
    );
  });

  it('leaves out a form without a Hof selection, which could not be handed in for a Hof', async () => {
    mockForms = [
      { ...standForm, id: 'form-no-hof', sections: [{ formSection: { fields: [] } }] },
      planForm,
    ];
    const { forms } = await getHofDashboardData('hof-nord', 'de', false);
    expect(forms.map((form) => form.id)).toEqual(['form-plan']);
  });

  it("maps a submission's state: approved is accepted, unreviewed is submitted", async () => {
    const stand = await formOf('form-stand');
    expect(stand.entries.map((entry) => [entry.id, entry.status])).toEqual([
      ['stand-b', 'accepted'],
      ['stand-a', 'submitted'],
    ]);
    const material = await formOf('form-material');
    expect(material.entries.map((entry) => [entry.status, entry.feedback])).toEqual([
      ['revisionRequired', 'Zu viele Latten'],
      ['inReview', undefined],
    ]);
  });

  it('lets a Hof withdraw only the newest version, while nobody reviewed it', async () => {
    const plan = await formOf('form-plan');
    expect(plan.mode).toBe('versions');
    expect(plan.entries.map((entry) => [entry.id, entry.withdrawable])).toEqual([
      ['plan-2', true],
      // unreviewed, but an older version is what the Ressort answered on
      ['plan-1', false],
    ]);
    const material = await formOf('form-material');
    expect(material.entries.every((entry) => !entry.withdrawable)).toBe(true);
  });

  it('leaves withdrawing to the Hof: a reviewer answers, and sees what was answered', async () => {
    const data = await getHofDashboardData('hof-nord', 'de', true);
    expect(data.isReviewer).toBe(true);
    expect(data.forms.flatMap((form) => form.entries).some((entry) => entry.withdrawable)).toBe(
      false,
    );
    const stand = await formOf('form-stand', true);
    // accepted is the approval, whatever status was left next to it
    expect(stand.entries.map((entry) => [entry.id, entry.status, entry.reviewStatus])).toEqual([
      ['stand-b', 'accepted', 'accepted'],
      // nothing answered yet
      ['stand-a', 'submitted', undefined],
    ]);
    const material = await formOf('form-material', true);
    expect(material.entries.map((entry) => entry.reviewStatus)).toEqual([
      'revisionRequired',
      'inReview',
    ]);
  });

  it('marks the form finalized when its newest version is final, and closes it to withdrawing', async () => {
    mockSubmissions = withSubmission('plan-2', { hofFinal: true });
    const plan = await formOf('form-plan');
    expect(plan.finalized).toBe(true);
    expect(plan.entries.map((entry) => [entry.id, entry.final, entry.withdrawable])).toEqual([
      // nobody gave it a status, but final is an answer too
      ['plan-2', true, false],
      ['plan-1', false, false],
    ]);
  });

  it('keeps a form open while its newest version is not final', async () => {
    await expect(formOf('form-plan')).resolves.toMatchObject({ finalized: false });
    // an earlier version marked final was followed by a newer one the Ressort let in
    mockSubmissions = withSubmission('plan-1', { hofFinal: true });
    await expect(formOf('form-plan')).resolves.toMatchObject({ finalized: false });
  });

  it('never finalizes a form of entries: each entry stands on its own', async () => {
    mockSubmissions = withSubmission('stand-b', { hofFinal: true });
    await expect(formOf('form-stand')).resolves.toMatchObject({ finalized: false });
  });

  it('lets a Hof withdraw any unreviewed entry of a form of entries', async () => {
    const stand = await formOf('form-stand');
    expect(stand.entries.map((entry) => [entry.id, entry.withdrawable, entry.title])).toEqual([
      ['stand-b', false, 'Crêpes'],
      ['stand-a', true, 'Büchsenschiessen'],
    ]);
  });

  it('shows the answers in the order the form asks them, without the Hof and messages', async () => {
    const plan = await formOf('form-plan');
    const [newest] = plan.entries;
    expect(newest?.answers.map((answer) => answer.field)).toEqual([
      'plan',
      'strom',
      'dach',
      'bemerkungen',
    ]);
    expect(newest?.answers).toContainEqual({
      field: 'strom',
      label: 'Stromanschluss (siehe Leitungsplan)',
      kind: 'text',
      text: 'Ja',
    });
    // a choice reads with its label, not its stored value
    expect(newest?.answers).toContainEqual({
      field: 'dach',
      label: 'Dach',
      kind: 'text',
      text: 'Holz',
    });
    // a version names nothing, only an entry does
    expect(newest?.title).toBeUndefined();
  });

  it('serves the handed-in files through the route that checks the Hof', async () => {
    const plan = await formOf('form-plan');
    const files = plan.entries[0]?.answers.find((answer) => answer.field === 'plan');
    // another Hof's file, named by its id, is not listed
    expect(files).toEqual({
      field: 'plan',
      label: 'Plan',
      kind: 'files',
      // a file that no longer exists is left out rather than linked
      files: [
        {
          id: 'file-a',
          name: 'Plan.pdf',
          url: '/api/form-file/file-a',
          size: 2048,
          mimeType: undefined,
        },
      ],
    });
  });

  it('shows a file only on the submission it was handed in with', async () => {
    const plan = await formOf('form-plan');
    const older = plan.entries.find((entry) => entry.id === 'plan-1');
    expect(older?.answers.map((answer) => answer.field)).toEqual(['bemerkungen']);
  });

  it('shows ordered material by the name it was ordered under', async () => {
    const material = await formOf('form-material');
    expect(material.entries[0]?.answers).toEqual([
      {
        field: 'holz',
        label: 'Holz',
        kind: 'materials',
        materials: [{ id: 'latte', name: 'Dachlatte', section: 'Holz', quantity: 12 }],
      },
    ]);
  });

  it('starts a new order from the material lists of the newest one', async () => {
    const material = await formOf('form-material');
    expect(material.initialValues).toEqual({ holz: materialAnswer(12) });
    // a form without material lists starts empty
    const plan = await formOf('form-plan');
    expect(plan.initialValues).toEqual({});
  });

  it('leaves a line the list no longer offers out of a new order', async () => {
    mockForms = [
      {
        ...materialForm,
        sections: [
          {
            formSection: {
              fields: [
                { blockType: 'hofSelection', name: 'hof', label: 'Hof' },
                {
                  blockType: 'materialList',
                  name: 'holz',
                  label: 'Holz',
                  items: [{ id: 'brett' }],
                },
              ],
            },
          },
        ],
      },
    ];
    const material = await formOf('form-material');
    expect(material.initialValues).toEqual({});
  });

  it('offers a form published only in German to a French reader', async () => {
    const untranslated = { ...standForm, _localized_status: { published: false } };
    mockForms = [untranslated, draftForm];
    mockGermanForms = [standForm, draftForm];
    const { forms } = await getHofDashboardData('hof-nord', 'fr', false);
    expect(forms.map((form) => form.id)).toEqual(['form-stand']);
  });

  it('closes a form at its due date', async () => {
    await expect(closedOf('form-plan')).resolves.toBe(true);
    // past its date, but set to stay open
    await expect(closedOf('form-material')).resolves.toBe(false);
    // no due date at all
    await expect(closedOf('form-stand')).resolves.toBe(false);
  });

  it('names who wrote the current feedback, not who last changed the status', async () => {
    const material = await formOf('form-material');
    expect(material.entries.map((entry) => [entry.id, entry.feedbackBy])).toEqual([
      ['material-2', { name: 'Tom Frei v/o Dachs', at: '2026-09-19T12:00:00.000Z' }],
      // no feedback, so nobody wrote it
      ['material-1', undefined],
    ]);
  });

  it('names nobody for feedback the history does not record', async () => {
    const stand = await formOf('form-stand');
    expect(stand.entries.every((entry) => entry.feedbackBy === undefined)).toBe(true);
  });

  it("keeps the review history from a Hof: it is the Ressort's working record", async () => {
    const material = await formOf('form-material');
    expect(material.entries.map((entry) => entry.reviewLog)).toEqual([[], []]);
  });

  it('shows a reviewer the review history, newest first', async () => {
    const material = await formOf('form-material', true);
    expect(material.entries.find((entry) => entry.id === 'material-1')?.reviewLog).toEqual([
      // a cleared status reads as handed in
      {
        at: '2026-09-03T12:00:00.000Z',
        by: 'Tom Frei v/o Dachs',
        status: 'submitted',
        feedback: '',
        final: false,
      },
      {
        at: '2026-09-02T12:00:00.000Z',
        by: 'Tom Frei v/o Dachs',
        status: 'inReview',
        feedback: 'Fehlt da nicht etwas?',
        final: false,
      },
    ]);
    expect(
      material.entries
        .find((entry) => entry.id === 'material-2')
        ?.reviewLog.map((change) => change.at),
    ).toEqual(['2026-09-20T12:00:00.000Z', '2026-09-19T12:00:00.000Z', '2026-09-18T12:00:00.000Z']);
  });

  it('shows a reviewer which change accepted a version and marked it final', async () => {
    mockSubmissions = withSubmission('material-2', {
      approved: true,
      hofFinal: true,
      hofReviewLog: [
        {
          changedAt: '2026-09-21T12:00:00.000Z',
          reviewerName: 'Freigabe-Link (E-Mail)',
          status: 'accepted',
          feedback: '',
          final: true,
        },
      ],
    });
    const material = await formOf('form-material', true);
    expect(material.entries[0]?.reviewLog).toEqual([
      {
        at: '2026-09-21T12:00:00.000Z',
        by: 'Freigabe-Link (E-Mail)',
        status: 'accepted',
        feedback: '',
        final: true,
      },
    ]);
  });

  it("names the Hof's address managers as Cevi.DB does, before they ever signed in", async () => {
    mockAddressManagerEmails = 'lea@example.com, bau@hof-nord.example.com';
    mockAddressManagers = [
      { name: 'Lea Roth v/o Alt', email: 'lea@example.com' },
      { name: 'Ben Bau v/o Hammer', email: 'bau@hof-nord.example.com' },
      { name: '', email: 'ohne-name@hof-nord.example.com' },
    ];
    const { responsible } = await getHofDashboardData('hof-nord', 'de', false);
    expect(responsible).toEqual([
      { name: 'Anna Beispiel v/o Fuchs', email: 'anna@example.com' },
      // signed in, listed once and named as Cevi.DB names her
      { name: 'Lea Roth v/o Alt', email: 'lea@example.com' },
      { name: 'Ben Bau v/o Hammer', email: 'bau@hof-nord.example.com' },
      { name: undefined, email: 'ohne-name@hof-nord.example.com' },
    ]);
  });

  it("lists a Hof's addresses alone until a sync kept the names, named once they signed in", async () => {
    mockAddressManagerEmails = 'LEA@example.com, bau@hof-nord.example.com, ';
    const { responsible } = await getHofDashboardData('hof-nord', 'de', false);
    expect(responsible).toEqual([
      { name: 'Anna Beispiel v/o Fuchs', email: 'anna@example.com' },
      { name: 'Lea Roth', email: 'lea@example.com' },
      // synced by the billing, but never signed in; Lea's address, written differently, once
      { name: undefined, email: 'bau@hof-nord.example.com' },
    ]);
  });

  it('lists nobody for a Hof without address managers', async () => {
    mockUsers = [];
    const { responsible } = await getHofDashboardData('hof-nord', 'de', false);
    expect(responsible).toEqual([]);
  });

  it('lists the deadlines by date and only documents with a file', async () => {
    const data = await getHofDashboardData('hof-nord', 'de', false);
    expect(data.deadlines.map((deadline) => deadline.title)).toEqual([
      'Grobkonzept',
      'Feinkonzept',
    ]);
    expect(data.documents).toEqual([
      { id: 'doc-1', title: 'Merkblatt', url: '/m.pdf', filesize: 100, area: 'infrastructure' },
    ]);
  });
});

describe('summarizeHofSubmission', () => {
  it('names a version as the dashboard heads it, counted from the oldest', async () => {
    await expect(summarizeHofSubmission('hof-nord', 'plan-1', 'de')).resolves.toEqual({
      form: 'Hofbauten',
      hof: 'Hof Nord',
      entry: 'Version 1',
      status: 'submitted',
    });
  });

  it('names an entry by its answer, with the status the dashboard shows', async () => {
    await expect(summarizeHofSubmission('hof-nord', 'stand-b', 'de')).resolves.toEqual({
      form: 'Stadtleben',
      hof: 'Hof Nord',
      entry: 'Crêpes',
      status: 'accepted',
    });
  });

  it('names nothing the dashboard does not list', async () => {
    await expect(summarizeHofSubmission('hof-nord', 'elsewhere', 'de')).resolves.toBeUndefined();
  });
});
