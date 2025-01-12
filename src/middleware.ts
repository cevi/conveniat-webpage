import { i18nRouter } from 'next-i18n-router';
import { NextRequest, NextResponse } from 'next/server';
import { i18nConfig } from '@/types';

export const middleware = (request: NextRequest): NextResponse => {
  return i18nRouter(request, i18nConfig);
};

// applies this middleware only to files in the app directory
export const config = {
  matcher: [
    '/((?!_next|favicon.svg|sw.js|swe-worker-*.js|manifest.webmanifest|sitemap.xml|robots.txt|api|admin|imgs|favicon-96x96.png|favicon.ico|apple-touch-icon.png|web-app-manifest-192x192.png|web-app-manifest-512x512.png).*)',
  ],
};
