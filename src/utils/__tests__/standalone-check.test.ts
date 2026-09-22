import { isNativeAppUserAgent, isNativeAppWebView } from '@/utils/standalone-check';

const setUserAgent = (value: string): void => {
  Object.defineProperty(navigator, 'userAgent', { value, configurable: true });
};

describe('isNativeAppUserAgent', () => {
  it.each(['Mozilla/5.0 KonektaApp/1.0', 'Mozilla/5.0 Conveniat27App/1.0'])(
    'detects the native shell in %s',
    (userAgent) => {
      expect(isNativeAppUserAgent(userAgent)).toBe(true);
    },
  );

  it('rejects a regular browser user agent', () => {
    expect(isNativeAppUserAgent('Mozilla/5.0 (iPhone) Mobile/15E148 Safari/604.1')).toBe(false);
    expect(isNativeAppUserAgent('')).toBe(false);
  });
});

describe('isNativeAppWebView', () => {
  const originalUserAgent = navigator.userAgent;

  afterEach(() => {
    setUserAgent(originalUserAgent);
  });

  it('is true inside the Conveniat27 native app', () => {
    setUserAgent('Mozilla/5.0 (iPhone) Conveniat27App/1.0');
    expect(isNativeAppWebView()).toBe(true);
  });

  it('is false in a regular browser', () => {
    setUserAgent('Mozilla/5.0 (iPhone) Mobile/15E148 Safari/604.1');
    expect(isNativeAppWebView()).toBe(false);
  });
});
