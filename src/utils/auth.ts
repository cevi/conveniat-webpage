import { authOptions } from '@/features/next-auth/utils/next-auth-config';
import NextAuth from 'next-auth';
import { cache } from 'react';

const nextAuth = NextAuth(authOptions);

export const { handlers, auth, signOut } = nextAuth;

export const getCachedSession = cache(async () => {
  return await auth();
});
