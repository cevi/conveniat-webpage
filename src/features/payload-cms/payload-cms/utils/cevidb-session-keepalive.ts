import { HITOBITO_CONFIG } from '@/lib/hitobito';
import { HitobitoClient } from '@/lib/hitobito/client';
import { SessionExpiredError } from '@/lib/hitobito/errors';
import type { Payload } from 'payload';

/** Remembers that the expiry has been reported, so it is reported once and not every run. */
const EXPIRED_FLAG_KEY = 'hitobito:session-expired-reported';
const EXPIRED_FLAG_TTL_SECONDS = 24 * 60 * 60;

/** What the keep-alive needs of Redis. */
interface FlagStore {
  set: (key: string, value: string, mode: 'EX', seconds: number, nx: 'NX') => Promise<unknown>;
  del: (key: string) => Promise<number>;
}

/** What one keep-alive run found. */
export type CeviDatabaseSessionState = 'alive' | 'expired' | 'no-cookie' | 'unreachable';

/**
 * Uses the stored Cevi.DB browser session once, so that it does not time out.
 *
 * The cookie in the registration settings is a copy of somebody's browser session, and
 * Hitobito ends a session after thirty minutes without a request. Our own use is far
 * sparser than that: a nightly sync, a bill run now and then. Without this the session is
 * gone by the time it is needed, and the first sign of it is a write-back that fails for
 * every registration of a run.
 *
 * Any page that needs a signed-in person counts as a request. The start page is one, and
 * Hitobito redirects it to that person's own profile.
 *
 * This cannot bring a session back. One that somebody ended by signing out stays ended and
 * needs a new cookie; that is logged once per day rather than on every run.
 *
 * @param ping requests a page with the given cookie; replaced in tests
 */
export const keepCeviDatabaseSessionAlive = async (
  payload: Payload,
  flags: FlagStore,
  ping: (browserCookie: string) => Promise<{ response: { ok: boolean; status: number } }> = (
    browserCookie,
  ) => new HitobitoClient({ ...HITOBITO_CONFIG, browserCookie }).frontendRequest('GET', '/'),
): Promise<CeviDatabaseSessionState> => {
  const settings = await payload.findGlobal({
    slug: 'registration-management',
    context: { internal: true },
  });
  const browserCookie = (settings.browserCookie ?? '').trim();
  if (browserCookie === '') return 'no-cookie';

  try {
    const { response } = await ping(browserCookie);
    // An error page from Cevi.DB or the proxy in front of it arrives as a normal response.
    // It shows neither that the session works nor that it is gone.
    if (!response.ok) {
      payload.logger.debug(
        { 'http.response.status_code': response.status },
        'Cevi.DB session keep-alive got an error page from Cevi.DB',
      );
      return 'unreachable';
    }
  } catch (error) {
    if (!(error instanceof SessionExpiredError)) {
      // Cevi.DB being down says nothing about the session, and the next run asks again.
      payload.logger.debug({ err: error }, 'Cevi.DB session keep-alive could not reach Cevi.DB');
      return 'unreachable';
    }

    // The flag only keeps the warning from repeating. Without Redis the warning repeats,
    // which is better than an operator never learning that the cookie has to be replaced.
    const isNews = await flags
      .set(EXPIRED_FLAG_KEY, '1', 'EX', EXPIRED_FLAG_TTL_SECONDS, 'NX')
      .then((result) => result === 'OK')
      .catch(() => true);
    if (isNews) {
      payload.logger.warn(
        'The Cevi.DB session has expired. Syncs lose the scraped fields and every write to Cevi.DB fails until a new browser cookie is stored in the registration settings.',
      );
    }
    return 'expired';
  }

  const wasReportedExpired = await flags
    .del(EXPIRED_FLAG_KEY)
    .then((removed) => removed > 0)
    .catch(() => false);
  if (wasReportedExpired) {
    payload.logger.info('The Cevi.DB session works again.');
  }
  return 'alive';
};
