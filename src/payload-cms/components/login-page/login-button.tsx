'use client';
import React from 'react';
import { signIn } from 'next-auth/react';

const handleLoginClick = (): void => {
  signIn('cevi-db').catch((error: unknown) => {
    console.error('Login error', error);
  });
};

const LoginButton: React.FC = () => {
  return <button onClick={handleLoginClick}>Login with CeviDB</button>;
};

export default LoginButton;
