import { EntrypointFastPath } from '@/features/onboarding/components/entrypoint-fast-path';
import { ONBOARDING_COMPLETE_KEY } from '@/lib/onboarding-complete';
import { renderToString } from 'react-dom/server';

/** Runs the inline script the way the browser does while it parses the entrypoint. */
const startApp = (
  url: string,
  local: Record<string, string> = {},
  session: Record<string, string> = {},
): string | undefined => {
  const html = renderToString(<EntrypointFastPath />);
  const source = /<script>([\S\s]*)<\/script>/.exec(html)?.[1] ?? '';
  let goneTo: string | undefined;
  const { pathname, search } = new URL(url, 'https://conveniat27.ch');
  const location = { pathname, search, replace: (to: string): void => void (goneTo = to) };
  const storageOf = (items: Record<string, string>): Pick<Storage, 'getItem'> => ({
    // eslint-disable-next-line unicorn/no-null -- what Storage.getItem answers for a missing key
    getItem: (key: string) => items[key] ?? null,
  });
  // eslint-disable-next-line @typescript-eslint/no-implied-eval -- the inline script under test
  const runScript = new Function('location', 'localStorage', 'sessionStorage', source) as (
    ...parameters: unknown[]
  ) => void;
  runScript(location, storageOf(local), storageOf(session));
  return goneTo;
};

const done = { [ONBOARDING_COMPLETE_KEY]: 'true' };

describe('starting the app once the onboarding is done', () => {
  it('goes straight to the dashboard', () => {
    expect(startApp('/entrypoint?app-mode=true', done)).toBe('/app/dashboard');
  });

  it('runs the onboarding while it is not done', () => {
    expect(startApp('/entrypoint?app-mode=true')).toBeUndefined();
  });

  it.each([
    '/entrypoint?app-mode=true&redirectTo=%2Fapp%2Fmap',
    '/entrypoint?app-mode=true&chatId=00000000-0000-4000-8000-000000000000',
    '/entrypoint?app-mode=true&clearSkip=true',
    '/entrypoint?app-mode=true&text=Treffpunkt',
    '/entrypoint',
    '/login?app-mode=true',
  ])('leaves %s to the onboarding', (url) => {
    expect(startApp(url, done)).toBeUndefined();
  });

  it('leaves a start from a push notification to the onboarding', () => {
    const pending = { pending_push_redirect: '/app/chat/00000000-0000-4000-8000-000000000000' };
    expect(startApp('/entrypoint?app-mode=true', done, pending)).toBeUndefined();
    expect(startApp('/entrypoint?app-mode=true', { ...done, ...pending })).toBeUndefined();
  });
});
