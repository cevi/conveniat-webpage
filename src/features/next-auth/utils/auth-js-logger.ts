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
 * flattened error, which is queryable in a way a bare stack line never was.
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

    target.error(message === '' ? type : message, { 'auth.error': type, error });
  },

  warn: (code): void => {
    target.warn(`Auth.js warning: ${code}`, { 'auth.warning': code });
  },

  debug: (message, metadata): void => {
    target.debug(message, { 'auth.metadata': metadata });
  },
});
