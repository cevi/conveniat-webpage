import { canMakeCalls } from '@/features/chat/calls/call-engine';
import type { NativeAppInfo } from '@/hooks/use-native-app-info';

const APP_USER_AGENT =
  'Mozilla/5.0 (Linux; Android 16; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36 Conveniat27App/1.0';
const CHROME_USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const CHROMIUM_BRANDS = [{ brand: 'Chromium' }, { brand: 'Google Chrome' }];

/** A page with WebRTC and a microphone API, as the browser behind the user agent shows it. */
const openIn = (userAgent: string, brands: { brand: string }[] = []): void => {
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { userAgent, userAgentData: { brands }, mediaDevices: {} },
  });
  Object.defineProperty(globalThis, 'RTCPeerConnection', {
    configurable: true,
    value: class {},
  });
};

const appBuild = (extra: Partial<NativeAppInfo> = {}): NativeAppInfo => ({
  version: '1.0.2',
  buildNumber: '12',
  platform: 'android',
  ...extra,
});

describe('canMakeCalls', () => {
  const originalNavigator = globalThis.navigator;
  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: originalNavigator,
    });
    Reflect.deleteProperty(globalThis, 'RTCPeerConnection');
    globalThis.AppWebViewNativeApp = undefined;
  });

  it('offers calls in a Chromium browser', () => {
    openIn(CHROME_USER_AGENT, CHROMIUM_BRANDS);
    expect(canMakeCalls()).toBe(true);
  });

  it('hides calls in an app build released before them, which has no microphone', () => {
    openIn(APP_USER_AGENT, CHROMIUM_BRANDS);
    globalThis.AppWebViewNativeApp = appBuild();
    expect(canMakeCalls()).toBe(false);
  });

  it('hides calls in the app until it said what it supports', () => {
    openIn(APP_USER_AGENT, CHROMIUM_BRANDS);
    expect(canMakeCalls()).toBe(false);
  });

  it('offers calls in an app build that declares the microphone', () => {
    openIn(APP_USER_AGENT, CHROMIUM_BRANDS);
    globalThis.AppWebViewNativeApp = appBuild({ voiceCalls: true });
    expect(canMakeCalls()).toBe(true);
  });

  it('hides calls in browsers other than Chromium', () => {
    openIn('Mozilla/5.0 (X11; Linux x86_64; rv:144.0) Gecko/20100101 Firefox/144.0');
    expect(canMakeCalls()).toBe(false);
  });
});
