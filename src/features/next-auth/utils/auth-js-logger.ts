import type { ServerLogger } from '@/utils/server-logger';
import type { NextAuthConfig } from 'next-auth';

type AuthJsLogger = NonNullable<NextAuthConfig['logger']>;

/**
 * What Auth.js calls the error: every `AuthError` carries its `ErrorType` on `type`, and nothing
 * else does. Auth.js's own default logger picks the same value through `instanceof AuthError`,
 * which is not available here because `next-auth` is ESM-only and importing it for a value would
 * pull the whole package into every consumer, Jest included.
 */
const errorType = (error: Error): string => {
  const { type } = error as { type?: unknown };
  return typeof type === 'string' && type !== '' ? type : error.name;
};

/**
 * Auth.js appends `Read more at https://errors.authjs.dev#<type>` to every message it builds.
 * The link repeats what `auth.error` already says, so it is stripped from the record body.
 */
const stripDocumentationLink = (message: string): string =>
  message.replace(/\.? ?Read more at https:\/\/errors\.authjs\.dev#\S*$/, '');

/**
 * The error an `AuthError` wraps. Auth.js does not chain it as `cause` but puts it on `cause.err`,
 * which is why a `CallbackRouteError` reached Loki as nothing but its docs link.
 */
const wrappedError = (error: Error): Error | undefined => {
  const { cause } = error as { cause?: unknown };
  if (typeof cause !== 'object' || cause === null) return undefined;
  const { err } = cause as { err?: unknown };
  return err instanceof Error ? err : undefined;
};

const nonEmptyString = (value: unknown): string | undefined =>
  typeof value === 'string' && value !== '' ? value : undefined;

/**
 * The RFC 6749 error code of a refused OAuth request, such as `invalid_grant` for an
 * authorization code that was already redeemed. oauth4webapi reports a refusal in one of two
 * shapes, depending on how the provider answered. A `ResponseBodyError` carries the code of the
 * JSON body on `error`. A `WWWAuthenticateChallengeError`, which is what Cevi.DB's refusals
 * arrive as, carries the challenges of the `WWW-Authenticate` header as an array on `cause`,
 * each with the code in its `parameters`.
 */
const oauthErrorCode = (error: Error | undefined): string | undefined => {
  const { error: code, cause } = (error ?? {}) as { error?: unknown; cause?: unknown };
  const fromBody = nonEmptyString(code);
  if (fromBody !== undefined || !Array.isArray(cause)) return fromBody;

  for (const challenge of cause as unknown[]) {
    const { parameters } = (challenge ?? {}) as { parameters?: unknown };
    const fromChallenge = nonEmptyString((parameters as { error?: unknown } | undefined)?.error);
    if (fromChallenge !== undefined) return fromChallenge;
  }
  return undefined;
};

/** The HTTP status the provider refused with; both oauth4webapi errors keep it on `status`. */
const responseStatus = (error: Error | undefined): number | undefined => {
  const status = (error as { status?: unknown } | undefined)?.status;
  return typeof status === 'number' ? status : undefined;
};

/** `UnknownAction` is always thrown as `Cannot parse action at <pathname>`. */
const unknownActionPath = /^Cannot parse action at (\S+)$/;

/**
 * Routes Auth.js's own output through our structured logger instead of its default one.
 *
 * Auth.js writes through `console.error`, which the console bridge mirrors into Loki at ERROR —
 * twice per occurrence, because the default logger prints the message and the stack as two
 * separate calls. Almost all of that volume is `UnknownAction`: a scanner requesting a path under
 * `/api/auth/` that is not one of Auth.js's actions. Auth.js already answers those itself and
 * nothing of ours failed, so they belong at debug with the probed path as an attribute, not in
 * the error rate. Every other Auth.js error keeps its level and gains `auth.error` plus the
 * flattened error, which is queryable in a way a bare stack line never was, and the error it
 * wraps as `auth.cause`, with the provider's `oauth.error` code and HTTP status when the provider
 * refused.
 *
 * @param target - The logger the records are written to; injectable for tests.
 * @returns A `logger` object for `NextAuthConfig`.
 */
export const createAuthJsLogger = (target: ServerLogger): AuthJsLogger => ({
  error: (error: Error): void => {
    const type = errorType(error);
    const message = stripDocumentationLink(error.message);

    if (type === 'UnknownAction') {
      const path = unknownActionPath.exec(message)?.[1];
      target.debug('Auth.js could not resolve the requested action', {
        'auth.error': type,
        ...(path === undefined ? {} : { 'url.path': path }),
      });
      return;
    }

    const cause = wrappedError(error);
    const oauthError = oauthErrorCode(cause);
    const status = responseStatus(cause);
    target.error(message === '' ? type : message, {
      'auth.error': type,
      error,
      ...(cause === undefined ? {} : { 'auth.cause': cause }),
      ...(oauthError === undefined ? {} : { 'oauth.error': oauthError }),
      ...(status === undefined ? {} : { 'http.response.status_code': status }),
    });
  },

  warn: (code): void => {
    target.warn(`Auth.js warning: ${code}`, { 'auth.warning': code });
  },

  debug: (message, metadata): void => {
    target.debug(message, { 'auth.metadata': metadata });
  },
});
