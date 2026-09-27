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
              { blockType: 'checkbox', name: 'strom', label: 'Stromanschluss' },
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
          { blockType: 'materialList', name: 'holz', label: 'Holz' },
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
      { field: 'plan', value: 'file-a, file-gone' },
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
    submissionData: [{ field: 'bemerkungen', value: 'Erster Entwurf' }],
  },
  {
    id: 'material-1',
    form: 'form-material',
    createdAt: '2026-09-01T10:00:00.000Z',
    submissionData: [{ field: 'holz', value: materialAnswer(4) }],
    hofReviewStatus: 'inReview',
  },
];

const STORED_FILES = [
  { id: 'file-a', originalFilename: 'Plan.pdf', filename: 'Plan-1a2b.pdf', filesize: 2048 },
];

let mockForms: unknown[] = [];

const mockPayload = {
  find: jest.fn(
    ({ collection, where }: { collection: string; where?: { id?: { in: string[] } } }) => {
      switch (collection) {
        case 'forms': {
          return Promise.resolve({ docs: mockForms, totalDocs: mockForms.length });
        }
        case 'form-submissions': {
          return Promise.resolve({ docs: SUBMISSIONS, totalDocs: SUBMISSIONS.length });
        }
        case 'form_collection': {
          const files = STORED_FILES.filter((file) => where?.id?.in.includes(file.id) === true);
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
      dashboardContacts: { avp: { name: 'Anna', email: 'avp@example.com' } },
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

jest.mock('@payload-config', () => ({ default: {} }), { virtual: true });
jest.mock('payload', () => ({ getPayload: (): Promise<unknown> => Promise.resolve(mockPayload) }));
jest.mock('@/utils/server-logger', () => ({
  createLogger: (): Record<string, jest.Mock> => ({ debug: jest.fn(), warn: jest.fn() }),
}));

import {
  getHofDashboardData,
  type HofDashboardForm,
} from '@/features/hof-dashboard/api/hof-dashboard-data';

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
});

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
      label: 'Stromanschluss',
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

  it('closes a form at its due date, but not for the reviewers', async () => {
    await expect(closedOf('form-plan')).resolves.toBe(true);
    await expect(closedOf('form-plan', true)).resolves.toBe(false);
    // past its date, but set to stay open
    await expect(closedOf('form-material')).resolves.toBe(false);
    // no due date at all
    await expect(closedOf('form-stand')).resolves.toBe(false);
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
    expect(data.contacts.avp).toEqual({ name: 'Anna', email: 'avp@example.com', phone: '' });
    expect(data.contacts.coach).toEqual({ name: '', email: '', phone: '' });
  });
});
