'use client';
import React from 'react';
import { signIn } from 'next-auth/react';
import { useLocale } from '@payloadcms/ui';
import { Config } from '@/payload-types';
import { CeviLogo } from '@/components/svg-logos/cevi-logo';

const handleLoginClick = (): void => {
  signIn('cevi-db').catch((error: unknown) => {
    console.error('Login error', error);
  });
};

const LoginButton: React.FC = () => {
  const { code } = useLocale() as { code: Config['locale'] };

  const localizedLoginText: {
    [key in Config['locale']]: string;
  } = {
    en: 'Login with CeviDB',
    de: 'Mit CeviDB anmelden',
    fr: 'Se connecter avec CeviDB',
  };

  return (
    <>
      {/* background logo */}
      <div className="fixed left-0 top-0 z-[-999] h-screen w-full bg-[#f8fafc] p-[56px]">
        <CeviLogo className="admin-panel-blur mx-auto h-full max-h-[60vh] w-full max-w-[384px] opacity-10" />
      </div>

      {/* login button */}
      <div className="flex justify-center">
        <button
          className="rounded border-2 border-solid border-green-600 bg-green-100 px-4 py-2 font-bold text-conveniat-green outline-none"
          onClick={handleLoginClick}
        >
          {localizedLoginText[code]}
        </button>
      </div>
    </>
  );
};

export default LoginButton;
