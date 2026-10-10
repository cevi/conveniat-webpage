import { findBrowserCookieProblem } from '@/features/registration_process/api/cevidb-browser-cookie';

describe('findBrowserCookieProblem', () => {
  it('accepts the full header of a browser signed in with "remember me"', () => {
    expect(
      findBrowserCookieProblem('lb=abc; _session_id=0123abcd; remember_person_token=xyz%3D%3D'),
    ).toBeUndefined();
  });

  it('rejects a single pasted value, which signs nobody in', () => {
    expect(findBrowserCookieProblem('0123abcd0123abcd0123abcd')).toBe('no-session');
    expect(findBrowserCookieProblem('remember_person_token=xyz')).toBe('no-session');
  });

  it('rejects a session without the remember token, which would end after 30 idle minutes', () => {
    expect(findBrowserCookieProblem('lb=abc; _session_id=0123abcd')).toBe('no-remember-token');
  });

  it('has nothing to say about an empty field or the clear keyword', () => {
    // Empty keeps the stored cookie, because the field never shows its value.
    expect(findBrowserCookieProblem('')).toBeUndefined();
    expect(findBrowserCookieProblem('  ')).toBeUndefined();
    expect(findBrowserCookieProblem('CLEAR')).toBeUndefined();
  });
});
