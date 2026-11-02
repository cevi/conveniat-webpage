import { handOffCallbackToNativeApp } from '@/features/next-auth/utils/native-app-login';
import { withoutUnchangedSessionCookie } from '@/features/next-auth/utils/session-token-change';
import { handlers } from '@/utils/auth';
import type { NextRequest } from 'next/server';

export const GET = withoutUnchangedSessionCookie(
  async (request: NextRequest): Promise<Response> =>
    handOffCallbackToNativeApp(request) ?? handlers.GET(request),
);
export const POST = withoutUnchangedSessionCookie(handlers.POST);
