const visitorRows = { count: jest.fn(), createMany: jest.fn() };
const fakePrisma = {
  visitDayVisitor: visitorRows,
  $transaction: (work: (transaction: unknown) => Promise<unknown>): Promise<unknown> =>
    work({ $executeRaw: jest.fn(), visitDayVisitor: visitorRows }),
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
          },
        ],
      },
    },
  ],
};

const fakeRequest = (): { request: PayloadRequest; remove: jest.Mock } => {
  const remove = jest.fn().mockResolvedValue({});
  const request = {
    locale: 'de',
    context: {},
    payload: {
      findByID: jest.fn().mockResolvedValue(form),
      findGlobal: jest.fn().mockResolvedValue({
        days: [{ date: '2027-07-28T10:00:00.000Z', capacity: 500, quartiere: ['q5'] }],
        hiddenHoefe: [],
      }),
      find: jest.fn().mockResolvedValue({
        docs: [{ id: 'uster', name: 'Cevi Uster', quartier: { id: 'q5', name: 'Quartier 5' } }],
      }),
      delete: remove,
      logger: { info: jest.fn(), warn: jest.fn() },
    },
  } as unknown as PayloadRequest;
  return { request, remove };
};

const register = async (request: PayloadRequest, persons: string): Promise<Answer[]> => {
  const data: unknown = await resolveVisitDay({
    data: {
      form: 'form-1',
      submissionData: [
        { field: 'hof', value: 'uster' },
        { field: 'anzahl_personen', value: persons },
      ],
    },
    req: request,
    operation: 'create',
  } as never);
  return (data as { submissionData: Answer[] }).submissionData;
};

const save = async (request: PayloadRequest): Promise<void> => {
  await reserveVisitDayPlaces({
    doc: { id: 'submission-1' },
    req: request,
    operation: 'create',
  } as never);
};

beforeEach(() => {
  visitorRows.count.mockReset();
  visitorRows.createMany.mockReset();
});

describe('a Besuchstag registration', () => {
  it('names the Hof and its day and takes one place per person', async () => {
    visitorRows.count.mockResolvedValue(0);
    const { request } = fakeRequest();

    const answers = await register(request, '2');
    await save(request);

    expect(answers).toEqual([
      { field: 'hof', value: 'Cevi Uster' },
      { field: 'anzahl_personen', value: '2' },
      { field: 'besuchstag', value: 'Mittwoch, 28. Juli 2027' },
    ]);
    expect(visitorRows.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({ submissionId: 'submission-1', hofId: 'uster', personNumber: 1 }),
        expect.objectContaining({ submissionId: 'submission-1', hofId: 'uster', personNumber: 2 }),
      ],
    });
  });

  it('is refused before saving when the day has too few places left', async () => {
    visitorRows.count.mockResolvedValue(499);
    const { request } = fakeRequest();

    await expect(register(request, '2')).rejects.toThrow('nicht mehr genug Plätze');
  });

  it('is removed again when the day filled up while it was being saved', async () => {
    // free when checked, full by the time the places are taken
    visitorRows.count.mockResolvedValueOnce(0).mockResolvedValueOnce(500);
    const { request, remove } = fakeRequest();

    await register(request, '1');
    await expect(save(request)).rejects.toThrow('nicht mehr genug Plätze');

    expect(visitorRows.createMany).not.toHaveBeenCalled();
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
