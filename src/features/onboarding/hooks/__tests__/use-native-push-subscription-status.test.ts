/**
 * @jest-environment jsdom
 */

import { useNativePushSubscriptionStatus } from '@/features/onboarding/hooks/use-native-push-subscription-status';
import { act, renderHook } from '@testing-library/react';

describe('useNativePushSubscriptionStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    globalThis.AppWebViewNativePush = undefined;
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0',
      configurable: true,
    });
  });

  it('returns false when not in native app WebView', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0',
      configurable: true,
    });

    const { result } = renderHook(() => useNativePushSubscriptionStatus());
    expect(result.current).toBe(false);
  });

  it('returns false initially in native app before status event', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'KonektaApp/1.0',
      configurable: true,
    });
    globalThis.AppWebViewNativePush = {
      getStatus: jest.fn(),
      requestPermission: jest.fn(),
      deleteToken: jest.fn(),
      openSettings: jest.fn(),
    };

    const { result } = renderHook(() => useNativePushSubscriptionStatus());
    expect(result.current).toBe(false);
    expect(globalThis.AppWebViewNativePush.getStatus).toHaveBeenCalled();
  });

  it('returns true when native-push-status event reports authorized with token', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'KonektaApp/1.0',
      configurable: true,
    });
    globalThis.AppWebViewNativePush = {
      getStatus: jest.fn(),
      requestPermission: jest.fn(),
      deleteToken: jest.fn(),
      openSettings: jest.fn(),
    };

    const { result } = renderHook(() => useNativePushSubscriptionStatus());

    act(() => {
      globalThis.dispatchEvent(
        new CustomEvent('app-webview-native-push-event', {
          detail: {
            type: 'native-push-status',
            payload: {
              authorizationLabel: 'authorized',
              hasToken: true,
              token: 'fake-token-12345678',
            },
          },
        }),
      );
    });

    expect(result.current).toBe(true);
  });

  it('returns false when native-push-status event reports authorized but no token', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'KonektaApp/1.0',
      configurable: true,
    });
    globalThis.AppWebViewNativePush = {
      getStatus: jest.fn(),
      requestPermission: jest.fn(),
      deleteToken: jest.fn(),
      openSettings: jest.fn(),
    };

    const { result } = renderHook(() => useNativePushSubscriptionStatus());

    act(() => {
      globalThis.dispatchEvent(
        new CustomEvent('app-webview-native-push-event', {
          detail: {
            type: 'native-push-status',
            payload: {
              authorizationLabel: 'authorized',
              hasToken: false,
            },
          },
        }),
      );
    });

    expect(result.current).toBe(false);
  });

  it('returns false when native-push-status event reports denied', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'KonektaApp/1.0',
      configurable: true,
    });
    globalThis.AppWebViewNativePush = {
      getStatus: jest.fn(),
      requestPermission: jest.fn(),
      deleteToken: jest.fn(),
      openSettings: jest.fn(),
    };

    const { result } = renderHook(() => useNativePushSubscriptionStatus());

    act(() => {
      globalThis.dispatchEvent(
        new CustomEvent('app-webview-native-push-event', {
          detail: {
            type: 'native-push-status',
            payload: {
              authorizationLabel: 'denied',
              hasToken: false,
            },
          },
        }),
      );
    });

    expect(result.current).toBe(false);
  });

  it('returns true when native-push-token event is received', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'KonektaApp/1.0',
      configurable: true,
    });
    globalThis.AppWebViewNativePush = {
      getStatus: jest.fn(),
      requestPermission: jest.fn(),
      deleteToken: jest.fn(),
      openSettings: jest.fn(),
    };

    const { result } = renderHook(() => useNativePushSubscriptionStatus());

    act(() => {
      globalThis.dispatchEvent(
        new CustomEvent('app-webview-native-push-event', {
          detail: {
            type: 'native-push-token',
            payload: {
              token: 'fake-fcm-token',
              platform: 'android',
            },
          },
        }),
      );
    });

    expect(result.current).toBe(true);
  });

  it('returns false when native-push-status event reports not-determined', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'KonektaApp/1.0',
      configurable: true,
    });
    globalThis.AppWebViewNativePush = {
      getStatus: jest.fn(),
      requestPermission: jest.fn(),
      deleteToken: jest.fn(),
      openSettings: jest.fn(),
    };

    const { result } = renderHook(() => useNativePushSubscriptionStatus());

    act(() => {
      globalThis.dispatchEvent(
        new CustomEvent('app-webview-native-push-event', {
          detail: {
            type: 'native-push-status',
            payload: {
              authorizationLabel: 'not-determined',
              hasToken: false,
            },
          },
        }),
      );
    });

    expect(result.current).toBe(false);
  });

  it('transitions from true to false when permission is revoked in device settings', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'KonektaApp/1.0',
      configurable: true,
    });
    globalThis.AppWebViewNativePush = {
      getStatus: jest.fn(),
      requestPermission: jest.fn(),
      deleteToken: jest.fn(),
      openSettings: jest.fn(),
    };

    const { result } = renderHook(() => useNativePushSubscriptionStatus());

    // First: permission is granted with token
    act(() => {
      globalThis.dispatchEvent(
        new CustomEvent('app-webview-native-push-event', {
          detail: {
            type: 'native-push-status',
            payload: {
              authorizationLabel: 'authorized',
              hasToken: true,
              token: 'fake-token',
            },
          },
        }),
      );
    });
    expect(result.current).toBe(true);

    // Then: user revokes permission in device settings, app resumes
    act(() => {
      globalThis.dispatchEvent(
        new CustomEvent('app-webview-native-push-event', {
          detail: {
            type: 'native-push-status',
            payload: {
              authorizationLabel: 'denied',
              hasToken: false,
            },
          },
        }),
      );
    });
    expect(result.current).toBe(false);
  });
});
