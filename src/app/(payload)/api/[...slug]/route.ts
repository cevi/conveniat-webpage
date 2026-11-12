/* THIS FILE WAS GENERATED AUTOMATICALLY BY PAYLOAD. */
/* Customized: wraps REST_GET to send a signed-out browser to the login on 403. */
import { auth } from '@/utils/auth';
import config from '@payload-config';
import {
  REST_DELETE,
  REST_GET,
  REST_OPTIONS,
  REST_PATCH,
  REST_POST,
} from '@payloadcms/next/routes';

const payloadGet = REST_GET(config);

/**
 * Wraps the Payload REST GET handler so that a signed-out visitor who opens a
 * protected document or file in the browser, like a link to a chat image, is
 * sent to the login and back, instead of reading Payload's JSON error.
 *
 * The path travels as a query parameter to `/login`, which hands it to Auth.js;
 * Auth.js only follows a callback on our own origin. A signed-in visitor keeps
 * Payload's 403, because logging in again would not change it, and so does
 * every request that does not ask for HTML.
 *
 * @see https://github.com/cevi/conveniat-webpage/issues/362
 */
const GET: typeof payloadGet = async (request, context) => {
  const response = await payloadGet(request, context);
  if (response.status !== 403) return response;

  const wantsHtml = (request.headers.get('accept') ?? '').includes('text/html');
  if (!wantsHtml || (await auth()) !== null) return response;

  const search = new URLSearchParams({ callbackUrl: new URL(request.url).pathname });
  return new Response(undefined, {
    status: 303,
    // Relative, so it stays on the host the browser used, whatever proxy sits in front.
    headers: { Location: `/login?${search.toString()}`, 'Cache-Control': 'no-store' },
  });
};

export { GET };
export const POST = REST_POST(config);
export const DELETE = REST_DELETE(config);
export const PATCH = REST_PATCH(config);
export const OPTIONS = REST_OPTIONS(config);
