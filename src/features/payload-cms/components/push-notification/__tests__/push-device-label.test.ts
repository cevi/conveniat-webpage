import { describePushDevice } from '@/features/payload-cms/components/push-notification/push-device-label';

const ANDROID_CHROME =
  'Mozilla/5.0 (Linux; Android 14; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36';
const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1';
const WINDOWS_EDGE =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0';
const ANDROID_SAMSUNG =
  'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/28.0 Chrome/130.0.0.0 Mobile Safari/537.36';

describe('describePushDevice', () => {
  it('names a phone browser with its system version', () => {
    expect(describePushDevice({ platform: 'web', userAgent: ANDROID_CHROME }, 'de')).toEqual({
      name: 'Chrome auf Android',
      detail: 'Android 14',
    });
    expect(describePushDevice({ platform: 'web', userAgent: IPHONE_SAFARI }, 'fr')).toEqual({
      name: 'Safari sur iPhone',
      detail: 'iOS 18.6',
    });
  });

  it('tells browsers apart that also name Chrome', () => {
    expect(describePushDevice({ platform: 'web', userAgent: WINDOWS_EDGE }, 'en').name).toBe(
      'Edge on Windows',
    );
    expect(describePushDevice({ platform: 'web', userAgent: ANDROID_SAMSUNG }, 'de').name).toBe(
      'Samsung Internet auf Android',
    );
  });

  it('names the native app by its platform', () => {
    expect(describePushDevice({ platform: 'ios', userAgent: null }, 'de')).toEqual({
      name: 'conveniat27-App',
      detail: 'iOS',
    });
  });

  it('still names a web device without a user agent', () => {
    expect(describePushDevice({ platform: 'web', userAgent: null }, 'de')).toEqual({
      name: 'Browser auf unbekanntem System',
      detail: undefined,
    });
  });
});
