import {
  handOffCallbackToNativeApp,
  startNativeAppLogin,
} from '@/features/next-auth/utils/native-app-login';

jest.mock('@/config/environment-variables', () => ({
  environmentVariables: {
    APP_HOST_URL: 'https://conveniat27.ch',
    HITOBITO_FORWARD_URL: 'https://db.cevi.ch',
  },
}));

jest.mock('@/utils/server-logger', () => ({
  createLogger: (): Record<string, jest.Mock> => ({
    info: jest.fn(),
    warn: jest.fn(),
  }),
}));

const SCHEME = 'ch.cevi.conveniat27';
const AUTHORIZE_URL =
  'https://db.cevi.ch/oauth/authorize?response_type=code&client_id=abc&code_challenge=xyz&state=attempt-1';

const startRequest = (authorize: string, scheme = SCHEME): Request =>
  new Request(
    `http://internal:3000/api/auth/native-app-login?authorize=${encodeURIComponent(authorize)}&scheme=${scheme}`,
  );

const callbackRequest = (state: string, cookie?: string): Request =>
  new Request(`http://internal:3000/api/auth/callback/cevi-db?code=the-code&state=${state}`, {
    headers: cookie === undefined ? {} : { cookie },
  });

const markFor = (scheme: string, state: string): string =>
  `native_app_login=${encodeURIComponent(`${scheme} ${state}`)}`;

describe('startNativeAppLogin', () => {
  it('marks the browser for this login attempt and forwards to Cevi.DB', () => {
    const response = startNativeAppLogin(startRequest(AUTHORIZE_URL));

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(AUTHORIZE_URL);
    expect(response.headers.get('set-cookie')).toBe(
      `${markFor(SCHEME, 'attempt-1')}; Path=/api/auth; Max-Age=300; HttpOnly; SameSite=Lax; Secure`,
    );
  });

  it('refuses to forward anywhere but the Cevi.DB authorize endpoint', () => {
    const response = startNativeAppLogin(
      startRequest('https://evil.example/oauth/authorize?state=attempt-1'),
    );

    expect(response.status).toBe(400);
    expect(response.headers.get('set-cookie')).toBeNull();
  });

  it('refuses a login without state, which could not be told from another one', () => {
    expect(
      startNativeAppLogin(startRequest('https://db.cevi.ch/oauth/authorize?client_id=abc')).status,
    ).toBe(400);
  });

  it('refuses a scheme that is not one of the apps', () => {
    expect(startNativeAppLogin(startRequest(AUTHORIZE_URL, 'conveniat27')).status).toBe(400);
  });
});

describe('handOffCallbackToNativeApp', () => {
  it('sends the callback of the marked attempt back to the app that started it', () => {
    const response = handOffCallbackToNativeApp(
      callbackRequest('attempt-1', markFor('ch.cevi.konekta', 'attempt-1')),
    );

    expect(response?.status).toBe(302);
    expect(response?.headers.get('location')).toBe(
      `ch.cevi.konekta://auth-callback?url=${encodeURIComponent(
        'https://conveniat27.ch/api/auth/callback/cevi-db?code=the-code&state=attempt-1',
      )}`,
    );
    expect(response?.headers.get('set-cookie')).toMatch(/^native_app_login=; .*Max-Age=0/);
  });

  it('leaves a later website login in the same browser to Auth.js', () => {
    expect(
      handOffCallbackToNativeApp(callbackRequest('attempt-2', markFor(SCHEME, 'attempt-1'))),
    ).toBeUndefined();
  });

  it('leaves an unmarked browser to Auth.js', () => {
    expect(handOffCallbackToNativeApp(callbackRequest('attempt-1'))).toBeUndefined();
  });

  it('ignores a mark with an unknown scheme', () => {
    expect(
      handOffCallbackToNativeApp(callbackRequest('attempt-1', markFor('evilapp', 'attempt-1'))),
    ).toBeUndefined();
  });

  it('only touches the Cevi.DB callback', () => {
    const request = new Request('http://internal:3000/api/auth/session?state=attempt-1', {
      headers: { cookie: markFor(SCHEME, 'attempt-1') },
    });

    expect(handOffCallbackToNativeApp(request)).toBeUndefined();
  });
});
