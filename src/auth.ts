import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

export const { handlers, signIn, signOut, auth } = NextAuth(authOptions)
