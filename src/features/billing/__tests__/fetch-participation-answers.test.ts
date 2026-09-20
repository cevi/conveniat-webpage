import { HitobitoServiceAdapter } from '@/features/billing/adapters/hitobito-service.adapter';
import type { HitobitoClient } from '@/features/registration_process/hitobito-api/client';
import { SessionExpiredError } from '@/features/registration_process/hitobito-api/errors';

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
