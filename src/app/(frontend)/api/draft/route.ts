import { isPreviewTokenValid } from '@/utils/preview-token';
import { draftMode } from 'next/headers';
import { redirect } from 'next/navigation';

/**
 * Draft mode API route for shared preview links.
 *
 * This route is used exclusively for **shared preview links** that use
 * a signed preview token. It enables Next.js draft mode and redirects
 * the user to the target page with `?preview=true`.
 *
 * Note: The admin panel no longer uses this route. Admin preview access
 * is handled directly via authentication checks in the page components
 * (see `canAccessPreviewOfCurrentPage` in preview-utils.tsx).
 *
 * Usage: GET /api/draft?auth=secret&preview-token=<token>&slug=<slug>
 *        GET /api/draft?disable=true
 *
 * This must be a GET request to allow simple redirects from preview links.
 */

const GET = async (request: Request): Promise<Response> => {
  const { searchParams } = new URL(request.url);

  const disable = searchParams.get('disable');
  if (disable === 'true') {
    const draft = await draftMode();
    draft.disable();
    return new Response('Draft mode disabled!', { status: 200 });
  }

  const slug = searchParams.get('slug');
  const previewToken = searchParams.get('preview-token');

  // verify the preview token
  const isValid = await isPreviewTokenValid(slug ?? '', previewToken ?? '');
  if (!isValid) return new Response('Invalid preview token for the given slug!', { status: 401 });

  // enable draft mode for the redirect target
  const draft = await draftMode();
  draft.enable();

  // redirect to the requested slug or homepage
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (slug !== null && slug !== undefined) {
    redirect(`${slug}?preview=true&preview-token=${previewToken ?? ''}`);
  }

  return new Response('Draft mode enabled!', { status: 200 });
};

export { GET };
