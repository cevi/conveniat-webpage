/* THIS FILE WAS GENERATED AUTOMATICALLY BY PAYLOAD. */
/* Customized: wraps REST_GET to return a user-friendly HTML error page on 403. */
import { buildAccessDeniedHtml } from '@/features/payload-cms/utils/access-denied-page';
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
 * Wraps the Payload REST GET handler to intercept 403 (Forbidden) responses
 * for document/file requests. Instead of returning raw JSON like
 * `{"errors":[{"message":"..."}]}`, this serves a proper HTML error page
 * with a login button.
 *
 * @see https://github.com/.../issues/362
 */
const GET: typeof payloadGet = async (request, context) => {
  const response = await payloadGet(request, context);

  // Only intercept 403 responses that would return JSON to a browser
  if (response.status === 403) {
    const acceptHeader = request.headers.get('accept') ?? '';
    const isApiCall =
      acceptHeader.includes('application/json') && !acceptHeader.includes('text/html');

    // If the client explicitly wants JSON (e.g. a fetch() call), don't intercept
    if (!isApiCall) {
      const cookieHeader = request.headers.get('cookie') ?? '';
      const localeMatch = /(?:^|;\s*)next-locale=([^;]+)/.exec(cookieHeader);
      const locale = localeMatch?.[1] ?? 'de';
      const loginCallbackUrl = new URL(request.url).pathname;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call
      return new Response(buildAccessDeniedHtml(locale, loginCallbackUrl), {
        status: 403,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
      });
    }
  }

  return response;
};

export { GET };
export const POST = REST_POST(config);
export const DELETE = REST_DELETE(config);
export const PATCH = REST_PATCH(config);
export const OPTIONS = REST_OPTIONS(config);
