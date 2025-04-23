import { CenteredConveniatLogo } from '@/features/onboarding/components/centered-conveniat-logo';
import { Cookie } from '@/types/types';
import Cookies from 'js-cookie';
import { signIn } from 'next-auth/react';
import React from 'react';

const handleLogin = (): void => {
  signIn('cevi-db', {
    redirect: false,
  })
    .then(() => {
      console.log('Logged in successfully!');
      Cookies.set(Cookie.HAS_LOGGED_IN, 'true');
    })
    .catch((error: unknown) => {
      console.error('Login error', error);
    });
};

export const LoginScreen: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  return (
    <div className="flex flex-col rounded-lg p-8 text-center">
      <CenteredConveniatLogo />

      <p className="mb-4 text-balance text-gray-700">
        Some app functionality require authentication, please log in.
      </p>
      <button
        onClick={handleLogin}
        className="rounded-[8px] bg-red-700 px-8 py-3 text-center font-heading text-lg font-bold leading-normal text-red-100 hover:bg-red-800"
      >
        Login mit Cevi.DB
      </button>

      <button onClick={onClick} className="mt-3 font-semibold text-gray-400">
        überspringen
      </button>
    </div>
  );
};
