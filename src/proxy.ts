import { designRewriteProxy } from '@/proxy/design-rewrite-proxy';
import { i18nProxy } from '@/proxy/i18n-proxy';
import { proxyChain } from '@/proxy/proxy-chain';

import type { ProxyModule } from '@/proxy/types';
import { isExcludedFromPathRewrites } from '@/proxy/utils/is-excluded-from-path-rewrites';
import { isUnhandledMultipartPost } from '@/proxy/utils/is-unhandled-multipart-post';
import { rotateSessionToken } from '@/proxy/utils/rotate-session-token';
import { NextResponse } from 'next/server';

/**
 * Answers multipart form posts to page routes that cannot be Server Function calls.
 *
 * Next.js parses such a body itself, so a malformed one thrown at a page URL by a scanner
 * crashes inside the parser before any route code runs. Runs first so nothing else in the
 * chain, in particular the session token rotation, does work for such a request.
 */
const rejectUnhandledFormPosts: ProxyModule = (next) => {
  return async (request, event, response) => {
    if (isUnhandledMultipartPost(request)) {
      return new NextResponse('Bad Request', { status: 400 });
    }
    return next(request, event, response);
  };
};

const authSessionProxy: ProxyModule = (next) => {
  return async (request, event, response) => {
    // We want auth() to run for most paths (including /admin and /api),
    // but not for purely static assets to save overhead.
    const { pathname } = request.nextUrl;
    const isStaticAsset =
      /\.(png|webp|ico|svg|webmanifest|xml|txt|jpg|jpeg|gif|js|map|json|css)$/i.test(pathname) ||
      pathname.startsWith('/imgs/') ||
      pathname.startsWith('/.well-known/') ||
      pathname === '/apple-app-site-association' ||
      pathname === '/sw.js' ||
      pathname === '/sw.js.map' ||
      pathname.startsWith('/serwist/');
    if (isStaticAsset) {
      return next(request, event, response);
    }

    // Check and propagate rotated token cookies
    await rotateSessionToken(request, event, response);

    return next(request, event, response);
  };
};

const skipExcludedPaths: ProxyModule = (next) => {
  return async (request, _event, response) => {
    if (isExcludedFromPathRewrites(request)) return response;
    return next(request, _event, response);
  };
};

const pathnameProxy: ProxyModule = (next) => {
  return async (request, _event, response) => {
    response.headers.set('x-pathname', request.nextUrl.pathname);
    return next(request, _event, response);
  };
};

export const proxy = proxyChain([
  { proxy: rejectUnhandledFormPosts, name: 'rejectUnhandledFormPosts' },
  { proxy: authSessionProxy, name: 'authSession' },
  { proxy: skipExcludedPaths, name: 'skipExcludedPaths' },
  { proxy: pathnameProxy, name: 'pathname' },
  { proxy: i18nProxy, name: 'i18n' },
  { proxy: designRewriteProxy, name: 'designRewrite' },
]);

export const config = {
  matcher: ['/((?!_next).*)'], // exclude _next routes
};
