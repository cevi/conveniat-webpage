import { canUserAccessAdminPanel } from '@/features/payload-cms/payload-cms/access-rules/can-access-admin-panel';
import { auth } from '@/utils/auth';
import { isValidNextAuthUser } from '@/utils/auth-helpers';
import { revalidateTag } from 'next/cache';

/**
 * Flushes all cached data from Next.js flush-cache.
 */
const GET = async (): Promise<Response> => {
  // get user session
  const session = await auth();
  if (!session) return new Response('No valid session found!', { status: 401 });

  // check user exists
  const user = isValidNextAuthUser(session.user) ? session.user : undefined;
  if (!user) return new Response('No valid user found!', { status: 401 });

  const isAuthenticated = await canUserAccessAdminPanel({
    user: user,
  });

  if (!isAuthenticated) {
    return new Response('Not authenticated', { status: 401 });
  }

  // flush all pages in nextjs
  try {
    revalidateTag('payload', 'max');
  } catch (error) {
    console.log(error);
    return new Response('Failed to flush flush-cache', { status: 500 });
  }

  return new Response('Cache flushed successfully', { status: 200 });
};

export { GET };
