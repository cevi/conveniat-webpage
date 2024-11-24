'use client';

import { signOut } from 'next-auth/react';

const Page = () => {
  signOut({
    redirect: true,
    redirectTo: '/',
  }).catch((e: unknown) => console.error(e));
  return <div>Signing out...</div>;
};

export default Page;
