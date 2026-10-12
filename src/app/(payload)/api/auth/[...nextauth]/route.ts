import { withoutUnchangedSessionCookie } from '@/features/next-auth/utils/session-token-change';
import { handlers } from '@/utils/auth';

export const GET = withoutUnchangedSessionCookie(handlers.GET);
export const POST = withoutUnchangedSessionCookie(handlers.POST);
