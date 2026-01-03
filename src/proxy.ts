import { designRewriteProxy } from '@/proxy/design-rewrite-proxy';
import { i18nProxy } from '@/proxy/i18n-proxy';
import { proxyChain } from '@/proxy/proxy-chain';

import type { ProxyModule } from '@/proxy/types';
import { isExcludedFromPathRewrites } from '@/proxy/utils/is-excluded-from-path-rewrites';

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
  { proxy: skipExcludedPaths, name: 'skipExcludedPaths' },
  { proxy: pathnameProxy, name: 'pathname' },
  { proxy: i18nProxy, name: 'i18n' },
  { proxy: designRewriteProxy, name: 'designRewrite' },
]);

export const config = {
  matcher: ['/((?!_next).*)'], // exclude _next routes
};
