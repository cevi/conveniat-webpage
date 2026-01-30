import { canUserAccessAdminPanel } from '@/features/payload-cms/payload-cms/access-rules/can-access-admin-panel';
import { auth } from '@/utils/auth';
import { isValidNextAuthUser } from '@/utils/auth-helpers';
import { isPreviewTokenValid } from '@/utils/preview-token';
import { draftMode } from 'next/headers';
import { redirect } from 'next/navigation';

/**
 * Enables preview mode for the current session.
 * Details can be found here: https://nextjs.org/docs/app/guides/draft-mode
 *
 * Preview mode can be enabled using a call to /api/draft.
 * This should be called in one of two scenarios:
 *
 * 1) If you view the PayloadCMS's admin panel, we enable preview mode globally
 *    until it is exited manually (for the current session). This happens via a call
 *    to /api/draft?auth=session&slug=*.
 *
 * 2) If you create and share a preview link. This link works as a redirect which first
 *    activates draft mode, then redirects the user to the requested slug.
 *    In that case, a call to /api/draft?auth=secret&preview=true&preview-token=<secret-token>
 *      &slug=/the/slug/you/want/to/visit.
 *
 * In either case, we do a double permission check, once while enabling the draft
 * mode during the execution of the /api/draft route (this is done to prevent a
 * malicious user from bypassing static rendering) and once while rendering the
 * actual page (i.e. before fetching the document in draft / published state),
 * we re-check if the user is allowed to visit the current page in preview mode.
 *
 * This must be a GET request to allow simple redirects from preview links.
 *
 */
 
const GET = async (request: Request): Promise<Response> => {
  const { searchParams } = new URL(request.url);
  const authMethod = searchParams.get('auth');

  const slug = searchParams.get('slug');

  const disable = searchParams.get('disable');
  if (disable === 'true') {
    const draft = await draftMode();
    draft.disable();
    return new Response('Draft mode disabled!', { status: 200 });
  }

  if (authMethod === 'secret') {
    const previewToken = searchParams.get('preview-token');

    // verify secret
    const isValid = await isPreviewTokenValid(slug ?? '', previewToken ?? '');
    if (!isValid) return new Response('Invalid preview token for the given slug!', { status: 401 });
  } else if (authMethod === 'session') {
    // get user session
    const session = await auth();
    if (!session) return new Response('No valid session found!', { status: 401 });

    // check user exists
    const user = isValidNextAuthUser(session.user) ? session.user : undefined;
    if (!user) return new Response('No valid user found!', { status: 401 });

    // check if user has permissions to access the admin panel
    const hasPermissionsForPreview = await canUserAccessAdminPanel({
      user: user,
    });
    if (!hasPermissionsForPreview)
      return new Response(
        `User '${JSON.stringify({ user: { groups: user.group_ids } })}' has no permissions for preview!`,
        {
          status: 401,
        },
      );
  } else {
    return new Response(`Invalid auth method ${authMethod}!`, { status: 401 });
  }

  // enable draft mode
  const draft = await draftMode();
  draft.enable();

  // redirect to the requested slug or homepage
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (slug !== null && slug !== undefined) {
    redirect(`${slug}?preview=true&preview-token=${searchParams.get('preview-token') ?? ''}`);
  }

  return new Response('Draft mode enabled!', { status: 200 });
};

export { GET };
