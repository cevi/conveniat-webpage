const visitorRows = { count: jest.fn() };
const registrationRows = {
  aggregate: jest.fn().mockResolvedValue({ _max: { counter: 6 } }),
  create: jest
    .fn<Promise<unknown>, [unknown]>()
    .mockResolvedValue({ id: 'registration-1', billNumber: 42 }),
  deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
};
const fakePrisma = {
  visitDayVisitor: visitorRows,
  visitDayRegistration: registrationRows,
  $transaction: (work: (transaction: unknown) => Promise<unknown>): Promise<unknown> =>
    work({
      $executeRaw: jest.fn(),
      visitDayVisitor: visitorRows,
      visitDayRegistration: registrationRows,
    }),
};

// read lazily: the mock factory runs before the constants above are initialised
jest.mock('@/lib/db/prisma', () => ({
  __esModule: true,
  get default(): typeof fakePrisma {
    return fakePrisma;
  },
}));
jest.mock('@/config/environment-variables', () => ({
  environmentVariables: { FEATURE_ENABLE_VISIT_DAY: true },
}));
jest.mock('payload', () => ({
  APIError: class extends Error {},
}));
// the bill has its own tests; here it matters that a registration asks for one
const createVisitDayBill = jest.fn().mockResolvedValue('bill-1');
jest.mock('@/features/visit-day/billing/create-visit-day-bill', () => ({
  createVisitDayBill: (...args: unknown[]): unknown => createVisitDayBill(...args),
}));

interface Answer {
  field: string;
  value: unknown;
}

const sendEmail: CollectionAfterChangeHook = ({ doc }) => doc as unknown;

import {
  reserveVisitDayPlaces,
  resolveVisitDay,
  withVisitDayPlaces,
} from '@/features/visit-day/payload-cms/visit-day-submission-hooks';
import type { CollectionAfterChangeHook, Config, PayloadRequest, Plugin } from 'payload';

const form = {
  sections: [
    {
      formSection: {
        fields: [
          {
            blockType: 'visitDaySelection',
            name: 'hof',
            personCountField: 'anzahl_personen',
            dayField: 'besuchstag',
            registrationNumberField: 'anmeldenummer',
            lunchField: 'mittagessen',
          },
        ],
      },
    },
  ],
};

/** The form above, with more settings on its Besuchstag field. */
const formWith = (settings: Record<string, unknown>): typeof form => ({
  sections: form.sections.map((section) => ({
    formSection: {
      fields: section.formSection.fields.map((field) => ({ ...field, ...settings })),
    },
  })),
});

const fakeRequest = (
  blockSettings: Record<string, unknown> = {},
  daySettings: Record<string, unknown> = {},
): { request: PayloadRequest; remove: jest.Mock; store: jest.Mock } => {
  const remove = jest.fn().mockResolvedValue({});
  const store = jest.fn().mockResolvedValue({});
  const request = {
    locale: 'de',
    context: {},
    payload: {
      findByID: jest.fn(({ collection }: { collection: string }) =>
        Promise.resolve(
          collection === 'hoefe'
            ? { groupId: '4242', events: [{ eventId: '5321' }] }
            : formWith(blockSettings),
        ),
      ),
      db: { updateOne: store },
      findGlobal: jest.fn().mockResolvedValue({
        days: [
          {
            date: '2027-07-28T10:00:00.000Z',
            capacity: 500,
            capacityWithoutLunch: 300,
            quartiere: ['q5'],
            ...daySettings,
          },
        ],
        hiddenHoefe: [],
      }),
      find: jest.fn().mockResolvedValue({
        docs: [{ id: 'uster', name: 'Cevi Uster', quartier: { id: 'q5', name: 'Quartier 5' } }],
      }),
      delete: remove,
      logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    },
  } as unknown as PayloadRequest;
  return { request, remove, store };
};

const submit = async (request: PayloadRequest, submissionData: Answer[]): Promise<Answer[]> => {
  const data: unknown = await resolveVisitDay({
    data: { form: 'form-1', submissionData },
    req: request,
    operation: 'create',
  } as never);
  return (data as { submissionData: Answer[] }).submissionData;
};

const register = async (
  request: PayloadRequest,
  persons: string,
  lunch = 'ja',
): Promise<Answer[]> =>
  submit(request, [
    { field: 'hof', value: 'uster' },
    { field: 'anzahl_personen', value: persons },
    { field: 'mittagessen', value: lunch },
  ]);

const save = async (request: PayloadRequest, answers: Answer[] = []): Promise<Answer[]> => {
  const document_: unknown = await reserveVisitDayPlaces({
    doc: { id: 'submission-1', submissionData: answers },
    req: request,
    operation: 'create',
  } as never);
  return (document_ as { submissionData: Answer[] }).submissionData;
};

beforeEach(() => {
  visitorRows.count.mockReset();
  registrationRows.create.mockClear();
  registrationRows.deleteMany.mockClear();
  createVisitDayBill.mockReset().mockResolvedValue('bill-1');
});

describe('a Besuchstag registration', () => {
  it('names the Hof, its day and its number, and takes one place per person', async () => {
    visitorRows.count.mockResolvedValue(0);
    const { request, store } = fakeRequest();

    const answers = await register(request, '2');
    const saved = await save(request, answers);

    expect(answers).toEqual([
      { field: 'hof', value: 'Cevi Uster' },
      { field: 'anzahl_personen', value: '2' },
      { field: 'mittagessen', value: 'ja' },
      { field: 'besuchstag', value: 'Mittwoch, 28. Juli 2027' },
    ]);
    expect(saved).toContainEqual({ field: 'anmeldenummer', value: '5321-B007' });
    expect(store).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'submission-1', data: { submissionData: saved } }),
    );
    expect(registrationRows.create.mock.calls[0]?.[0]).toMatchObject({
      data: {
        number: '5321-B007',
        hofId: 'uster',
        withLunch: true,
        visitors: { create: [{ personNumber: 1 }, { personNumber: 2 }] },
      },
    });
  });

  it('issues the bill of the saved registration, in the language of the form', async () => {
    visitorRows.count.mockResolvedValue(0);
    const { request } = fakeRequest();

    await save(request, await register(request, '2'));

    expect(createVisitDayBill).toHaveBeenCalledWith(
      request.payload,
      expect.objectContaining({
        submissionId: 'submission-1',
        registrationId: 'registration-1',
        registrationNumber: '5321-B007',
        billNumber: 42,
        date: '2027-07-28',
        hofId: 'uster',
        persons: 2,
        withLunch: true,
        locale: 'de',
      }),
      expect.anything(),
      request,
    );
  });

  it('undoes the registration and frees its places when its bill cannot be issued', async () => {
    visitorRows.count.mockResolvedValue(0);
    createVisitDayBill.mockRejectedValue(new Error('settings missing'));
    const { request, remove } = fakeRequest();
    const answers = await register(request, '2');

    await expect(save(request, answers)).rejects.toThrow('nicht gespeichert');
    expect(registrationRows.deleteMany).toHaveBeenCalledWith({
      where: { submissionId: 'submission-1' },
    });
    expect(remove).toHaveBeenCalledWith(expect.objectContaining({ id: 'submission-1' }));
  });

  it('does not take a number the sender made up', async () => {
    visitorRows.count.mockResolvedValue(0);
    const { request } = fakeRequest();

    const answers = await submit(request, [
      { field: 'hof', value: 'uster' },
      { field: 'anzahl_personen', value: '1' },
      { field: 'mittagessen', value: 'ja' },
      { field: 'anmeldenummer', value: '5321-B001' },
    ]);

    expect(answers).not.toContainEqual({
      field: 'anmeldenummer',
      value: '5321-B001',
    });
  });

  it('is refused before saving when the day has too few places left', async () => {
    visitorRows.count.mockResolvedValue(499);
    const { request } = fakeRequest();

    await expect(register(request, '2')).rejects.toThrow('nicht mehr genug Plätze mit Mittagessen');
  });

  it('takes places without lunch from their own capacity', async () => {
    // all places with lunch are taken, but only 298 of the 300 without
    visitorRows.count.mockImplementation(
      ({ where }: { where: { registration: { withLunch: boolean } } }) =>
        Promise.resolve(where.registration.withLunch ? 500 : 298),
    );
    const { request } = fakeRequest();

    await save(request, await register(request, '2', 'nein'));

    expect(registrationRows.create.mock.calls[0]?.[0]).toMatchObject({
      data: { withLunch: false, visitors: { create: [{ personNumber: 1 }, { personNumber: 2 }] } },
    });
    visitorRows.count.mockResolvedValue(299);
    await expect(register(fakeRequest().request, '2', 'nein')).rejects.toThrow(
      'nicht mehr genug Plätze ohne Mittagessen',
    );
  });

  it('is refused without an answer about lunch', async () => {
    visitorRows.count.mockResolvedValue(0);
    const { request } = fakeRequest();

    await expect(register(request, '1', '')).rejects.toThrow('zu Mittag');
  });

  it('lets a visitor without a Hof pick the day, numbered apart from the Höfe', async () => {
    visitorRows.count.mockResolvedValue(0);
    const { request } = fakeRequest();

    const answers = await submit(request, [
      { field: 'hof', value: 'extern' },
      { field: 'anzahl_personen', value: '1' },
      { field: 'mittagessen', value: 'ja' },
      { field: 'besuchstag', value: '2027-07-28' },
    ]);
    await save(request, answers);

    expect(answers).toEqual([
      { field: 'hof', value: 'Ohne Bezug zu einer Abteilung' },
      { field: 'anzahl_personen', value: '1' },
      { field: 'mittagessen', value: 'ja' },
      { field: 'besuchstag', value: 'Mittwoch, 28. Juli 2027' },
    ]);
    expect(registrationRows.create.mock.calls[0]?.[0]).toMatchObject({
      data: { number: 'EXT-B007', hofId: null },
    });
  });

  it('refuses a day that is not offered to a visitor without a Hof', async () => {
    visitorRows.count.mockResolvedValue(0);
    const { request } = fakeRequest();

    await expect(
      submit(request, [
        { field: 'hof', value: 'extern' },
        { field: 'anzahl_personen', value: '1' },
        { field: 'mittagessen', value: 'ja' },
        { field: 'besuchstag', value: '2027-08-01' },
      ]),
    ).rejects.toThrow('einen der Besuchstage');
  });

  it('is removed again when the day filled up while it was being saved', async () => {
    // free when checked, full by the time the places are taken
    visitorRows.count.mockResolvedValueOnce(0).mockResolvedValueOnce(500);
    const { request, remove } = fakeRequest();

    await register(request, '1');
    await expect(save(request)).rejects.toThrow('nicht mehr genug Plätze');

    expect(registrationRows.create).not.toHaveBeenCalled();
    expect(remove).toHaveBeenCalledWith(
      expect.objectContaining({ collection: 'form-submissions', id: 'submission-1' }),
    );
  });
});

describe('withVisitDayPlaces', () => {
  it('takes the places before the form builder sends its confirmation email', async () => {
    const formBuilder: Plugin = (config) => ({
      ...config,
      collections: [{ slug: 'form-submissions', fields: [], hooks: { afterChange: [sendEmail] } }],
    });

    const config = await withVisitDayPlaces(formBuilder)({} as Config);

    const submissions = config.collections?.find(
      (collection) => collection.slug === 'form-submissions',
    );
    expect(submissions?.hooks?.afterChange).toEqual([reserveVisitDayPlaces, sendEmail]);
  });
});

/** The answers of a field that asks whom they visit. */
const childVisit = (besuch: string, hof: string, persons: string): Answer[] => [
  { field: 'besuch', value: besuch },
  { field: 'hof', value: hof },
  { field: 'anzahl_personen', value: persons },
  { field: 'mittagessen', value: 'ja' },
];

describe('a Besuchstag field that asks whom they visit and the persons', () => {
  const settings = { visitorTypeField: 'besuch', maxPersons: 2 };

  it('registers visitors without a Hof by that answer, whatever Hof was left chosen', async () => {
    visitorRows.count.mockResolvedValue(0);
    const { request } = fakeRequest(settings);

    const answers = await submit(request, [
      { field: 'besuch', value: 'extern' },
      { field: 'hof', value: 'uster' },
      { field: 'besuchstag', value: '2027-07-28' },
      { field: 'anzahl_personen', value: '1' },
      { field: 'mittagessen', value: 'ja' },
    ]);
    await save(request, answers);

    expect(answers).toContainEqual({ field: 'hof', value: 'Ohne Bezug zu einer Abteilung' });
    expect(registrationRows.create.mock.calls[0]?.[0]).toMatchObject({
      data: { number: 'EXT-B007', hofId: null },
    });
  });

  it('refuses a child visit without a Hof, a missing answer and too many persons', async () => {
    visitorRows.count.mockResolvedValue(0);

    await expect(
      submit(fakeRequest(settings).request, childVisit('kind', 'extern', '1')),
    ).rejects.toThrow('Für diese Abteilung ist keine Anmeldung');
    await expect(
      submit(fakeRequest(settings).request, childVisit('', 'uster', '1')),
    ).rejects.toThrow('wen ihr besucht');
    await expect(
      submit(fakeRequest(settings).request, childVisit('kind', 'uster', '3')),
    ).rejects.toThrow('Anzahl Personen ist ungültig');
    await expect(
      submit(fakeRequest(settings).request, childVisit('kind', 'uster', '2')),
    ).resolves.toContainEqual({ field: 'hof', value: 'Cevi Uster' });
  });
});

/** The answers of a visitor without a Hof for the day in the settings above. */
const externalVisit = (persons: string): Answer[] => [
  { field: 'besuch', value: 'extern' },
  { field: 'besuchstag', value: '2027-07-28' },
  { field: 'anzahl_personen', value: persons },
  { field: 'mittagessen', value: 'ja' },
];

describe('the Kontingent for visitors without a Hof', () => {
  const settings = { visitorTypeField: 'besuch', maxPersons: 2 };

  it('takes them while it has places left, counting those already registered', async () => {
    // 10 places with lunch taken, 49 of the Kontingent of 50
    visitorRows.count.mockImplementation(({ where }: { where: { registration: object } }) =>
      Promise.resolve('hofId' in where.registration ? 49 : 10),
    );

    await expect(
      submit(fakeRequest(settings, { externalCapacity: 50 }).request, externalVisit('1')),
    ).resolves.toContainEqual({ field: 'hof', value: 'Ohne Bezug zu einer Abteilung' });
    await expect(
      submit(fakeRequest(settings, { externalCapacity: 50 }).request, externalVisit('2')),
    ).rejects.toThrow('ohne Bezug zu einer Abteilung sind an diesem Tag nicht mehr genug');
  });

  it('refuses them on a day closed to them, or one whose Kontingent is 0', async () => {
    visitorRows.count.mockResolvedValue(0);

    await expect(
      submit(fakeRequest(settings, { externalCapacity: -1 }).request, externalVisit('1')),
    ).rejects.toThrow('keine Anmeldung ohne Bezug zu einer Abteilung möglich');
    await expect(
      submit(fakeRequest(settings, { externalCapacity: 0 }).request, externalVisit('1')),
    ).rejects.toThrow('nicht mehr genug Plätze');
  });

  it('is removed again when the Kontingent filled up while it was being saved', async () => {
    visitorRows.count.mockImplementation(({ where }: { where: { registration: object } }) =>
      Promise.resolve('hofId' in where.registration ? 49 : 0),
    );
    const { request, remove } = fakeRequest(settings, { externalCapacity: 50 });
    const answers = await submit(request, externalVisit('1'));

    // another visitor without a Hof took the last place meanwhile
    visitorRows.count.mockImplementation(({ where }: { where: { registration: object } }) =>
      Promise.resolve('hofId' in where.registration ? 50 : 0),
    );
    await expect(save(request, answers)).rejects.toThrow('ohne Bezug zu einer Abteilung');
    expect(registrationRows.create).not.toHaveBeenCalled();
    expect(remove).toHaveBeenCalled();
  });

  it('lets a form that no longer asks whom they visit register a child visit', async () => {
    visitorRows.count.mockResolvedValue(0);
    const withoutAnswer = childVisit('', 'uster', '1').filter(
      (answer) => answer.field !== 'besuch',
    );

    await expect(
      submit(fakeRequest(settings, { externalCapacity: -1 }).request, withoutAnswer),
    ).resolves.toContainEqual({ field: 'hof', value: 'Cevi Uster' });
    // while a day still takes visitors without a Hof, the form asks and the answer is needed
    await expect(
      submit(fakeRequest(settings, { externalCapacity: 0 }).request, withoutAnswer),
    ).rejects.toThrow('wen ihr besucht');
  });
});
