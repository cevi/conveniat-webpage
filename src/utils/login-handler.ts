import { Cookie } from '@/types/types';
import Cookies from 'js-cookie';
import { signIn } from 'next-auth/react';

/**
 * Initiates the OAuth login flow with Cevi.DB (Hitobito).
 * Note: signIn() triggers a browser redirect, so this function
 * won't actually complete - the browser navigates away.
 */
export const handleLogin = (): void => {
  signIn('cevi-db')
    .then(() => {
      console.log('Logged in successfully!');
      Cookies.set(Cookie.HAS_LOGGED_IN, 'true', {
        expires: 730, // 2 years
      });
    })
    .catch((error: unknown) => {
      console.error('Login error', error);
    });
};
