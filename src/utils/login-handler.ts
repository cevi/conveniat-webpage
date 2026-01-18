import { Cookie } from '@/types/types';
import Cookies from 'js-cookie';
import { signIn, signOut } from 'next-auth/react';

/**
 * Initiates the OAuth login flow with Cevi.DB (Hitobito).
 * Note: signIn() triggers a browser redirect, so this function
 * won't actually complete - the browser navigates away.
 */
export const handleLogin = (callbackUrl?: string): void => {
  signIn('cevi-db', callbackUrl ? { callbackUrl } : undefined)
    .then(() => {
      console.log('Logged in successfully!');
      Cookies.set(Cookie.HAS_LOGGED_IN, 'true', {
        expires: 730, // 2 years
      });
      // Ensure skipped auth cookie is removed if we actually log in
      Cookies.remove(Cookie.HAS_SKIPPED_AUTH);
    })
    .catch((error: unknown) => {
      console.error('Login error', error);
    });
};

/**
 * Handles skipping the login flow.
 * Clears any existing login state and sets a cookie to remember the choice.
 */
export const handleSkipLogin = (): void => {
  // Clear any existing auth state
  void signOut({ redirect: false });
  Cookies.remove(Cookie.HAS_LOGGED_IN);

  // Set skip auth cookie
  Cookies.set(Cookie.HAS_SKIPPED_AUTH, 'true', {
    expires: 730, // 2 years
  });
};
