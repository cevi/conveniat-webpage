import NextAuth from 'next-auth/next'
import { authOptions } from '@/lib/auth'

const handler = NextAuth(authOptions)

export const dynamic = true
export { handler as GET, handler as POST }
