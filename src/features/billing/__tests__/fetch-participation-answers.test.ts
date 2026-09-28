import { HitobitoServiceAdapter } from '@/features/billing/adapters/hitobito-service.adapter';
import type { HitobitoClient } from '@/lib/hitobito/client';
import { SessionExpiredError } from '@/lib/hitobito/errors';

const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };

const EDIT_PATH = '/groups/7/events/42/participations/900/edit';

/**
 * A client whose JSON:API leg is empty, so every test below falls through to the two
 * frontend legs the browser cookie pays for.
 */
const adapterWith = (
  frontendRequest: jest.Mock,
  apiRequest: jest.Mock = jest.fn().mockResolvedValue({}),
): HitobitoServiceAdapter =>
  new HitobitoServiceAdapter(
    {
      config: { baseUrl: 'https://db.cevi.ch', apiToken: 'token', browserCookie: 'stale' },
      apiRequest,
      frontendRequest,
      submitRailsForm: jest.fn(),
      getFrontendHeaders: (): Record<string, string> => ({}),
    } as unknown as HitobitoClient,
    logger,
  );

describe('HitobitoServiceAdapter.fetchParticipationAnswers', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fails loudly when the legacy endpoint has lost the session', async () => {
    const adapter = adapterWith(
      jest.fn().mockRejectedValue(new SessionExpiredError(`https://db.cevi.ch${EDIT_PATH}`)),
    );

    await expect(adapter.fetchParticipationAnswers('42', '900', '7')).rejects.toBeInstanceOf(
      SessionExpiredError,
    );
  });

  it('fails loudly when the scraped edit page has lost the session', async () => {
    // A registration with no answers and one that cannot be read look identical to every
    // caller downstream: both arrive as `{}` and park the row as incomplete.
    const adapter = adapterWith(
      jest.fn((_method: string, path: string) =>
        path.endsWith('/edit')
          ? Promise.reject(new SessionExpiredError(`https://db.cevi.ch${EDIT_PATH}`))
          : Promise.resolve({ response: { ok: false, status: 500 } as Response, body: '' }),
      ),
    );

    await expect(adapter.fetchParticipationAnswers('42', '900', '7')).rejects.toBeInstanceOf(
      SessionExpiredError,
    );
  });

  it('finds the answers of a registration past the first page of the legacy list', async () => {
    // Cevi.DB pages the legacy list at 50, so the 51st registration of a Hof is on page 2.
    const pages: Record<string, unknown> = {
      '1': {
        total_pages: 2,
        event_participations: [{ id: 1, links: { event_answers: [11] } }],
        linked: { event_answers: [{ id: 11, question: 'Essgewohnheit', answer: 'vegan' }] },
      },
      '2': {
        total_pages: 2,
        event_participations: [{ id: 900, links: { event_answers: [12] } }],
        linked: { event_answers: [{ id: 12, question: 'Essgewohnheit', answer: 'vegetarisch' }] },
      },
    };
    const frontendRequest = jest.fn(
      (_method: string, _path: string, options: { params?: Record<string, string> }) =>
        Promise.resolve({
          response: { ok: true, status: 200 } as Response,
          body: JSON.stringify(pages[options.params?.['page'] ?? '']),
        }),
    );

    await expect(
      adapterWith(frontendRequest).fetchParticipationAnswers('42', '900', '7'),
    ).resolves.toEqual({ Essgewohnheit: 'vegetarisch' });
    expect(frontendRequest).toHaveBeenCalledTimes(2);
  });

  it('still answers with an empty map when the read failed for any other reason', async () => {
    const adapter = adapterWith(
      jest.fn().mockResolvedValue({ response: { ok: false, status: 500 } as Response, body: '' }),
    );

    await expect(adapter.fetchParticipationAnswers('42', '900', '7')).resolves.toEqual({});
  });
});

describe('HitobitoServiceAdapter.fetchParticipations', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fails loudly when a restricted person cannot be read', async () => {
    // Cevi.DB hides the person behind a restricted profile, so the list falls back to the
    // frontend. With no session that fallback used to answer `undefined`, and the
    // participation reached the sync as "Person 900" with no address at all.
    const restrictedList = jest.fn().mockResolvedValue({
      data: [
        {
          id: '900',
          type: 'event_participations',
          attributes: { event_id: 42, active: true },
          // eslint-disable-next-line unicorn/no-null -- what the API sends for a restricted profile
          relationships: { participant: { data: null } },
        },
      ],
      meta: { stats: { total: { count: 1 } } },
    });
    const adapter = adapterWith(
      jest.fn().mockRejectedValue(new SessionExpiredError(`https://db.cevi.ch${EDIT_PATH}`)),
      restrictedList,
    );

    await expect(adapter.fetchParticipations('7', '42')).rejects.toBeInstanceOf(
      SessionExpiredError,
    );
  });
});

const participationResource = (id: string): Record<string, unknown> => ({
  id,
  type: 'event_participations',
  attributes: { event_id: 42, active: true },
  relationships: { participant: { data: { id: `p${id}`, type: 'people' } } },
});

const personResource = (id: string): Record<string, unknown> => ({
  id: `p${id}`,
  type: 'people',
  attributes: { first_name: 'Anna', last_name: `Muster ${id}`, nickname: '' },
});

const participationPage = (
  ids: string[],
  total: number,
  next?: string,
): Record<string, unknown> => ({
  data: ids.map((id) => participationResource(id)),
  included: ids.map((id) => personResource(id)),
  links: next === undefined ? {} : { next },
  meta: { stats: { total: { count: total } } },
});

describe('HitobitoServiceAdapter.fetchParticipations pagination', () => {
  beforeEach(() => jest.clearAllMocks());

  it('collects every page', async () => {
    const apiRequest = jest
      .fn()
      .mockResolvedValueOnce(
        participationPage(['1', '2'], 3, '/api/event_participations?page[number]=2'),
      )
      .mockResolvedValueOnce(participationPage(['3'], 3));

    const participations = await adapterWith(jest.fn(), apiRequest).fetchParticipations('7', '42');

    expect(participations.map((p) => p.participationId)).toEqual(['1', '2', '3']);
  });

  it('fails when the pages do not add up to the total Cevi.DB reports', async () => {
    // A registration that fell between two pages must not read as a deregistration: the
    // sync would cancel its bill.
    const apiRequest = jest
      .fn()
      .mockResolvedValueOnce(
        participationPage(['1', '2'], 4, '/api/event_participations?page[number]=2'),
      )
      .mockResolvedValueOnce(participationPage(['2', '3'], 4));

    await expect(adapterWith(jest.fn(), apiRequest).fetchParticipations('7', '42')).rejects.toThrow(
      'Cevi.DB meldet für Anlass 42 4 Anmeldungen, abgerufen wurden 3.',
    );
  });

  it('fails when Cevi.DB reports no total to check the list against', async () => {
    const apiRequest = jest.fn().mockResolvedValue({ ...participationPage(['1'], 1), meta: {} });

    await expect(adapterWith(jest.fn(), apiRequest).fetchParticipations('7', '42')).rejects.toThrow(
      'keine Gesamtzahl',
    );
  });
});
