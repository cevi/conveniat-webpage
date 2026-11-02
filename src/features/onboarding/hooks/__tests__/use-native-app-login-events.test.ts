/**
 * @jest-environment jsdom
 */

import { useNativeAppLoginEvents } from '@/features/onboarding/hooks/use-native-app-login-events';
import { act, renderHook } from '@testing-library/react';

let visibilityState: DocumentVisibilityState = 'visible';

beforeEach(() => {
  visibilityState = 'visible';
  jest.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibilityState);
});

/** The WebView hiding this page while the system browser is on top, and showing it again. */
const show = (state: DocumentVisibilityState): void => {
  visibilityState = state;
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
};

const dispatch = (name: string): void => {
  act(() => {
    globalThis.dispatchEvent(new Event(name));
  });
};

describe('a login the native app opened in the system browser', () => {
  const onOpened = jest.fn();
  const onCancelled = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();
    onOpened.mockClear();
    onCancelled.mockClear();
    renderHook(() => useNativeAppLoginEvents({ onOpened, onCancelled }));
    dispatch('native-app-login-opened');
    show('hidden');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('ends the wait when the app reports the browser closed', () => {
    show('visible');
    dispatch('native-app-login-cancelled');

    expect(onOpened).toHaveBeenCalledTimes(1);
    expect(onCancelled).toHaveBeenCalledTimes(1);
  });

  it('ends the wait once the page is shown again, also when the app never reports it', () => {
    show('visible');
    act(() => {
      jest.advanceTimersByTime(4999);
    });
    expect(onCancelled).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(onCancelled).toHaveBeenCalledTimes(1);
  });

  it('keeps waiting while the user goes back to the browser', () => {
    show('visible');
    show('hidden');
    act(() => {
      jest.advanceTimersByTime(60_000);
    });

    expect(onCancelled).not.toHaveBeenCalled();
  });
});

describe('a page the app never moved to the system browser', () => {
  it('does not end a wait when it is shown again', () => {
    jest.useFakeTimers();
    const onCancelled = jest.fn();
    renderHook(() => useNativeAppLoginEvents({ onOpened: jest.fn(), onCancelled }));

    show('hidden');
    show('visible');
    act(() => {
      jest.advanceTimersByTime(60_000);
    });

    expect(onCancelled).not.toHaveBeenCalled();
    jest.useRealTimers();
  });
});
