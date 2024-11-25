import NextAuth from 'next-auth';
import { authOptions } from '@/auth/next-auth-config';

export const { handlers, auth } = NextAuth(authOptions);
