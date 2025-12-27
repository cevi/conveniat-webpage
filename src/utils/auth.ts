import { authOptions } from '@/features/next-auth/utils/next-auth-config';
import NextAuth from 'next-auth';

export const { handlers, auth } = NextAuth(authOptions);
