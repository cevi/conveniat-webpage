import { Cookie } from '@/types/types';
import Cookies from 'js-cookie';
import { signIn } from 'next-auth/react';

export const handleLogin = (): void => {
  signIn('cevi-db', {
    redirect: false,
  })
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
