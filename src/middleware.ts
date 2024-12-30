import { i18nRouter } from 'next-i18n-router';
import { NextRequest, NextResponse } from 'next/server';
import { Config } from 'next-i18n-router/dist/types';

const locales = ['en', 'de', 'fr'] as const;

export const i18nConfig: Config = {
  locales: locales,
  defaultLocale: 'de',
  serverSetCookie: 'always',
};

export type Locale = (typeof locales)[number];

export const middleware = (request: NextRequest): NextResponse => {
  return i18nRouter(request, i18nConfig);
};

// applies this middleware only to files in the app directory
export const config = {
  matcher: [
    '/((?!_next|favicon.svg|manifest.webmanifest|sitemap.xml|robots.txt|api|admin|imgs|favicon-96x96.png|favicon.ico|apple-touch-icon.png|web-app-manifest-192x192.png|web-app-manifest-512x512.png).*)',
  ],
};
