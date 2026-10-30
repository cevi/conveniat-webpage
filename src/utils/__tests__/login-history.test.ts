/**
 * @jest-environment jsdom
 */

import { rememberHistoryBeforeLogin, rewindHistoryAfterLogin } from '@/utils/login-history';

const setHistoryLength = (length: number): void => {
  jest.spyOn(globalThis.history, 'length', 'get').mockReturnValue(length);
};

describe('login history rewind', () => {
  let go: jest.SpyInstance;

  beforeEach(() => {
    sessionStorage.clear();
    go = jest.spyOn(globalThis.history, 'go').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('goes back over the Cevi.DB pages to the page that started the login', () => {
    setHistoryLength(3);
    rememberHistoryBeforeLogin();

    // the Cevi.DB sign-in form and the callback landing page
    setHistoryLength(5);
    rewindHistoryAfterLogin();

    expect(go).toHaveBeenCalledWith(-2);
    expect(sessionStorage.getItem('login_history_return_to')).toBe(globalThis.location.href);
  });

  it('stays when Cevi.DB still had a session and only redirected', () => {
    setHistoryLength(3);
    rememberHistoryBeforeLogin();

    setHistoryLength(4);
    rewindHistoryAfterLogin();

    expect(go).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('login_history_return_to')).toBeNull();
  });

  it('rewinds only once per login', () => {
    setHistoryLength(3);
    rememberHistoryBeforeLogin();
    setHistoryLength(5);
    rewindHistoryAfterLogin();
    sessionStorage.removeItem('login_history_return_to');

    rewindHistoryAfterLogin();

    expect(go).toHaveBeenCalledTimes(1);
  });

  it('does nothing on a page load without a login', () => {
    setHistoryLength(5);
    rewindHistoryAfterLogin();

    expect(go).not.toHaveBeenCalled();
  });
});
