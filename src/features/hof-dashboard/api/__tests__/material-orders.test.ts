const published = { published: true };

/** A material list with two sections, and the remarks the Ressort reads beside it. */
const orderForm = {
  id: 'form-order',
  title: 'Materialbestellung Hof-Infrastruktur',
  _localized_status: published,
  hofDashboard: { area: 'material', entries: 'versions', deadline: '2027-01-31T12:00:00.000Z' },
  sections: [
    {
      formSection: {
        fields: [
          { blockType: 'hofSelection', name: 'hof', label: 'Hof' },
          {
            blockType: 'materialList',
            name: 'material',
            label: 'Material',
            items: [
              { id: 'rope', name: 'Bindestrick', section: 'Allgemein' },
              { id: 'log', name: 'Baumstamm 6 m', section: 'Holz' },
            ],
          },
          { blockType: 'textarea', name: 'bemerkungen', label: 'Bemerkungen' },
        ],
      },
    },
  ],
};

/** A plan, not an order: it has no material list and is left out. */
const planForm = {
  id: 'form-plan',
  title: 'Hofbauten',
  _localized_status: published,
  hofDashboard: { area: 'infrastructure', entries: 'versions' },
  sections: [{ formSection: { fields: [{ blockType: 'hofSelection', name: 'hof' }] } }],
};

const lines = (...ordered: { id: string; name?: string; quantity: number }[]): string =>
  JSON.stringify(ordered);

/** Newest first, as the query sorts them. */
const SUBMISSIONS = [
  {
    id: 'uster-2',
    form: 'form-order',
    hof: 'hof-uster',
    createdAt: '2026-10-29T20:14:00.000Z',
    submissionData: [
      { field: 'hof', value: 'hof-uster' },
      // a material the form no longer offers keeps the name the order stored
      {
        field: 'material',
        value: lines(
          { id: 'rope', quantity: 60 },
          { id: 'gone', name: 'Schalungstafel', quantity: 3 },
        ),
      },
      { field: 'bemerkungen', value: 'Bitte gerade Stämme.' },
    ],
  },
  {
    id: 'uster-1',
    form: 'form-order',
    hof: 'hof-uster',
    createdAt: '2026-10-12T18:45:00.000Z',
    hofReviewStatus: 'revisionRequired',
    hofFeedback: 'Zu viele Stämme.',
    submissionData: [
      { field: 'material', value: lines({ id: 'rope', quantity: 50 }, { id: 'log', quantity: 8 }) },
    ],
  },
  {
    id: 'zueri-1',
    form: 'form-order',
    hof: 'hof-zueri',
    createdAt: '2026-10-01T10:00:00.000Z',
    approved: true,
    hofFinal: true,
    submissionData: [{ field: 'material', value: lines({ id: 'log', quantity: 12 }) }],
  },
];

let mockExports: { form: string; exportedAt: string }[] = [];

const mockPayload = {
  find: jest.fn(({ collection }: { collection: string }) =>
    Promise.resolve(
      collection === 'forms'
        ? { docs: [planForm, orderForm] }
        : { docs: SUBMISSIONS, totalDocs: SUBMISSIONS.length },
    ),
  ),
  findGlobal: jest.fn(() => Promise.resolve({ materialOrderExports: mockExports })),
  updateGlobal: jest.fn<Promise<unknown>, [unknown]>(() => Promise.resolve({})),
};

jest.mock('@/config/environment-variables', () => ({
  environmentVariables: { FEATURE_ENABLE_HOF_DASHBOARD: true },
}));
jest.mock('@payload-config', () => ({ default: {} }), { virtual: true });
jest.mock('payload', () => ({ getPayload: (): Promise<unknown> => Promise.resolve(mockPayload) }));
jest.mock('@/utils/server-logger', () => ({
  createLogger: (): Record<string, jest.Mock> => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  }),
}));

import {
  getMaterialOrders,
  recordMaterialOrderExport,
} from '@/features/hof-dashboard/api/material-orders';

const HOEFE = [
  { id: 'hof-uster', name: 'Cevi Uster' },
  { id: 'hof-zueri', name: 'Züri 11' },
  { id: 'hof-bubikon', name: 'Bubikon Wolfhausen' },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockExports = [];
});

describe('getMaterialOrders', () => {
  it('counts the newest version of every Hof and lists every Hof, those without an order too', async () => {
    const [form, ...others] = await getMaterialOrders(HOEFE, 'de');

    expect(others).toEqual([]);
    expect(form?.title).toBe('Materialbestellung Hof-Infrastruktur');
    expect(form?.items).toEqual([
      { id: 'rope', name: 'Bindestrick', section: 'Allgemein' },
      { id: 'log', name: 'Baumstamm 6 m', section: 'Holz' },
      { id: 'gone', name: 'Schalungstafel', section: undefined },
    ]);
    expect(form?.hoefe.map((hof) => [hof.hofName, hof.quantities, hof.orderedAt])).toEqual([
      // the eight logs of the version sent back no longer count
      ['Cevi Uster', { rope: 60, gone: 3 }, '2026-10-29T20:14:00.000Z'],
      ['Züri 11', { log: 12 }, '2026-10-01T10:00:00.000Z'],
      ['Bubikon Wolfhausen', {}, undefined],
    ]);
  });

  it("keeps every version with the Ressort's answer and the Hof's remarks", async () => {
    const [form] = await getMaterialOrders(HOEFE, 'de');
    const uster = form?.hoefe[0];

    expect(uster?.versions.map((version) => version.id)).toEqual(['uster-2', 'uster-1']);
    expect(uster?.versions[0]?.remarks).toEqual([
      { label: 'Bemerkungen', text: 'Bitte gerade Stämme.' },
    ]);
    expect(uster?.versions[1]).toMatchObject({
      status: 'revisionRequired',
      feedback: 'Zu viele Stämme.',
      quantities: { rope: 50, log: 8 },
    });
    expect(form?.hoefe[1]?.versions[0]).toMatchObject({ status: 'accepted', final: true });
  });

  it('marks what was handed in after the last export of the form', async () => {
    mockExports = [{ form: 'form-order', exportedAt: '2026-10-20T08:00:00.000Z' }];
    const [form] = await getMaterialOrders(HOEFE, 'de');

    expect(form?.exportedAt).toBe('2026-10-20T08:00:00.000Z');
    expect(form?.hoefe.map((hof) => hof.changedSinceExport)).toEqual([true, false, false]);
  });

  it('marks every order as changed while the form was never exported', async () => {
    const [form] = await getMaterialOrders(HOEFE, 'de');

    expect(form?.hoefe.map((hof) => hof.changedSinceExport)).toEqual([true, true, false]);
  });
});

describe('recordMaterialOrderExport', () => {
  it('replaces the time of the exported forms and keeps that of the others', async () => {
    mockExports = [
      { form: 'form-order', exportedAt: '2026-10-01T08:00:00.000Z' },
      { form: 'form-stadtleben', exportedAt: '2026-10-02T08:00:00.000Z' },
    ];
    await recordMaterialOrderExport(['form-order'], new Date('2026-10-31T09:00:00.000Z'));

    expect(mockPayload.updateGlobal).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: 'hof-dashboard-settings',
        data: {
          materialOrderExports: [
            { form: 'form-stadtleben', exportedAt: '2026-10-02T08:00:00.000Z' },
            { form: 'form-order', exportedAt: '2026-10-31T09:00:00.000Z' },
          ],
        },
      }),
    );
  });

  it('does not fail the download when the time cannot be stored', async () => {
    mockPayload.updateGlobal.mockRejectedValueOnce(new Error('validation failed'));

    await expect(recordMaterialOrderExport(['form-order'], new Date())).resolves.toBeUndefined();
  });
});
