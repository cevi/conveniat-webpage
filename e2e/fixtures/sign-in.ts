import type { APIRequestContext, BrowserContext } from '@playwright/test';
import { expect } from '@playwright/test';

/** User 3 of the fake Cevi.DB server, "Benutzer Nr. 3 v/o NoAccess": a participant without rights. */
export const PARTICIPANT = 3;

/** One pass through the fake Cevi.DB OAuth login; true once a session exists. */
const attemptSignIn = async (request: APIRequestContext, fakeUser: number): Promise<boolean> => {
  const csrfResponse = await request.get('/api/auth/csrf');
  const csrf = (await csrfResponse.json()) as { csrfToken: string };

  const start = await request.post('/api/auth/signin/cevi-db', {
    form: { csrfToken: csrf.csrfToken, callbackUrl: '/app/dashboard' },
    maxRedirects: 0,
  });
  const authorize = new URL(start.headers()['location'] ?? '').searchParams;
  const callbackUrl = authorize.get('redirect_uri');
  expect(callbackUrl, 'the sign-in should redirect to the Cevi.DB login').toBeTruthy();

  // What the fake login page does when a user is picked. Auth.js checks the `state` it sent.
  const callback = new URL(callbackUrl ?? '');
  callback.searchParams.set('code', `fake-auth-code-${fakeUser}`);
  callback.searchParams.set('state', authorize.get('state') ?? '');
  await request.get(callback.toString(), { maxRedirects: 0 });

  const sessionResponse = await request.get('/api/auth/session');
  const session = (await sessionResponse.json()) as { user?: unknown } | null;
  return Boolean(session?.user);
};

/**
 * Signs in through the fake Cevi.DB OAuth server, the way a camp participant does.
 *
 * On a freshly reset stack, two workers signing in the same new user at the same moment race on
 * creating that user and one callback fails (CallbackRouteError). That is setup, not what these
 * tests are about, so it is tried again.
 */
export const signIn = async (
  context: BrowserContext | APIRequestContext,
  fakeUser: number = PARTICIPANT,
): Promise<void> => {
  const request = 'request' in context ? context.request : context;
  let signedIn = false;
  for (let attempt = 0; attempt < 3 && !signedIn; attempt += 1) {
    signedIn = await attemptSignIn(request, fakeUser);
  }
  expect(signedIn, 'the Cevi.DB sign-in should leave a session').toBe(true);
};
