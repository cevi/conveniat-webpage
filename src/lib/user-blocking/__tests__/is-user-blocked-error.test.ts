/**
 * @jest-environment jsdom
 */
import { USER_BLOCKED_ERROR_MESSAGE } from '@/lib/user-blocking/constants';
import {
  isUserBlockedError,
  shouldReloadForBlockedUser,
} from '@/lib/user-blocking/is-user-blocked-error';

describe('isUserBlockedError', () => {
  it('detects the blocked marker in an error message', () => {
    expect(isUserBlockedError(new Error(USER_BLOCKED_ERROR_MESSAGE))).toBe(true);
  });

  it('detects the marker inside a wrapped tRPC message', () => {
    expect(isUserBlockedError({ message: `FORBIDDEN: ${USER_BLOCKED_ERROR_MESSAGE}` })).toBe(true);
  });

  it('ignores unrelated errors', () => {
    expect(isUserBlockedError(new Error('User not authenticated.'))).toBe(false);
    expect(isUserBlockedError('USER_BLOCKED')).toBe(false);
    // eslint-disable-next-line unicorn/no-null
    expect(isUserBlockedError(null)).toBe(false);
    // eslint-disable-next-line unicorn/no-useless-undefined
    expect(isUserBlockedError(undefined)).toBe(false);
  });
});

describe('shouldReloadForBlockedUser', () => {
  beforeEach(() => {
    globalThis.sessionStorage.clear();
  });

  it('allows the first reload', () => {
    expect(shouldReloadForBlockedUser()).toBe(true);
  });

  it('throttles further reloads so that they cannot loop', () => {
    expect(shouldReloadForBlockedUser()).toBe(true);
    expect(shouldReloadForBlockedUser()).toBe(false);
    expect(shouldReloadForBlockedUser()).toBe(false);
  });

  it('allows a reload again once the throttle window has passed', () => {
    expect(shouldReloadForBlockedUser()).toBe(true);

    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 120_000);
    expect(shouldReloadForBlockedUser()).toBe(true);
    nowSpy.mockRestore();
  });
});
