const DOCS: Record<string, unknown[]> = {
  'hof-submissions': [
    {
      id: 'sub-flagpole',
      submissionType: 'flagpole',
      status: 'revisionRequired',
      feedback: 'Statik',
    },
  ],
  'hof-files': [
    {
      id: 'file-2',
      submission: 'sub-flagpole',
      kind: 'plan',
      originalFilename: 'Plan.pdf',
      filename: 'Plan-b.pdf',
      url: '/api/hof-files/file/Plan-b.pdf',
      createdAt: '2026-09-20T10:00:00.000Z',
    },
    {
      id: 'file-1',
      submission: 'sub-flagpole',
      kind: 'plan',
      originalFilename: 'Plan.pdf',
      filename: 'Plan-a.pdf',
      url: '/api/hof-files/file/Plan-a.pdf',
      createdAt: '2026-09-10T10:00:00.000Z',
    },
  ],
  'hof-material-orders': [
    {
      orderType: 'infrastructure',
      items: [
        { itemId: 'rope', name: 'Bindestrick', quantity: 3 },
        { itemId: 'spade', name: 'Spaten', quantity: 2 },
      ],
      powerConnection: false,
      updatedAt: '2026-09-25T08:00:00.000Z',
    },
  ],
  'form-submissions': [
    {
      id: 'entry-1',
      submissionData: [{ field: 'stand', value: 'Crêpes' }],
      approved: true,
      createdAt: '2026-09-21T10:00:00.000Z',
    },
  ],
};

const mockPayload = {
  find: jest.fn(({ collection }: { collection: string }) =>
    Promise.resolve({
      docs: DOCS[collection] ?? [],
      totalDocs: DOCS[collection]?.length ?? 0,
    }),
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
        {
          id: 'later',
          date: '2027-05-31T10:00:00.000Z',
          title: 'Feinkonzept',
          area: 'infrastructure',
          submissionTypes: ['flagpole'],
        },
        {
          id: 'first',
          date: '2027-01-31T10:00:00.000Z',
          title: 'Grobkonzept',
          area: 'infrastructure',
          submissionTypes: ['flagpole', 'entrance'],
        },
      ],
      infrastructureOrder: {
        deadline: '2026-11-06T10:00:00.000Z',
        items: [{ id: 'rope', name: 'Bindestrick', section: 'Holz' }],
      },
      stadtlebenOrder: { items: [] },
      stadtlebenForm: { id: 'form-stadtleben' },
      stadtlebenTitleFieldName: 'stand',
      documents: [
        {
          document: { id: 'doc-1', title: 'Merkblatt', url: '/m.pdf', filesize: 100 },
          area: 'infrastructure',
        },
        // a document whose file is gone has nothing to download
        { document: { id: 'doc-2', title: 'Ohne Datei' } },
      ],
      safetyRiskCriteria: [{ criterion: 'Absturzhöhe über 3 Metern' }],
    }),
  ),
};

jest.mock('@payload-config', () => ({ default: {} }), { virtual: true });
jest.mock('payload', () => ({ getPayload: (): Promise<unknown> => Promise.resolve(mockPayload) }));
jest.mock('@/utils/server-logger', () => ({
  createLogger: (): Record<string, jest.Mock> => ({ debug: jest.fn(), warn: jest.fn() }),
}));

import { getHofDashboardData } from '@/features/hof-dashboard/api/hof-dashboard-data';

describe('getHofDashboardData', () => {
  it("shows a Hof's plans with their versions, status and deadlines", async () => {
    const data = await getHofDashboardData('hof-nord', 'de');
    const flagpole = data.submissions.find((submission) => submission.type === 'flagpole');
    expect(flagpole).toMatchObject({
      status: 'revisionRequired',
      feedback: 'Statik',
      deadlines: ['2027-01-31T10:00:00.000Z', '2027-05-31T10:00:00.000Z'],
    });
    expect(flagpole?.files.map((file) => [file.filename, file.version])).toEqual([
      ['Plan.pdf', 2],
      ['Plan.pdf', 1],
    ]);
    // a plan nobody touched yet is listed, empty
    expect(data.submissions.find((submission) => submission.type === 'entrance')).toMatchObject({
      status: undefined,
      files: [],
      deadlines: ['2027-01-31T10:00:00.000Z'],
    });
    expect(data.deadlines.map((deadline) => deadline.title)).toEqual([
      'Grobkonzept',
      'Feinkonzept',
    ]);
  });

  it('keeps ordered material that has since left the list apart', async () => {
    const { orders } = await getHofDashboardData('hof-nord', 'de');
    expect(orders.infrastructure.items).toEqual([
      { id: 'rope', name: 'Bindestrick', section: 'Holz', quantity: 3 },
    ]);
    expect(orders.infrastructure.retiredItems).toEqual([
      { id: 'spade', name: 'Spaten', quantity: 2 },
    ]);
    expect(orders.stadtleben).toMatchObject({ items: [], savedAt: undefined });
  });

  it("lists only this Hof's Stadtleben registrations, named by the chosen answer", async () => {
    const { stadtleben } = await getHofDashboardData('hof-nord', 'de');
    expect(stadtleben.entries).toEqual([
      { id: 'entry-1', title: 'Crêpes', submittedAt: '2026-09-21T10:00:00.000Z', approved: true },
    ]);
    const query = mockPayload.find.mock.calls
      .map(([options]) => options as { collection: string; where?: unknown })
      .find((options) => options.collection === 'form-submissions');
    expect(query?.where).toEqual({
      and: [{ form: { equals: 'form-stadtleben' } }, { hof: { equals: 'hof-nord' } }],
    });
  });

  it('fills in missing contacts and skips documents without a file', async () => {
    const data = await getHofDashboardData('hof-nord', 'de');
    expect(data.contacts.avp).toEqual({ name: 'Anna', email: 'avp@example.com', phone: '' });
    expect(data.contacts.coach).toEqual({ name: '', email: '', phone: '' });
    expect(data.documents.map((document) => document.title)).toEqual(['Merkblatt']);
    expect(data.safetyRiskCriteria).toEqual(['Absturzhöhe über 3 Metern']);
  });
});
