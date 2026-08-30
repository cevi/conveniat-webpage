import { isExcludedFromPathRewrites } from '@/proxy/utils/is-excluded-from-path-rewrites';
import type { NextRequest } from 'next/server';

const requestFor = (pathname: string): NextRequest =>
  ({ nextUrl: { pathname } }) as unknown as NextRequest;

describe('isExcludedFromPathRewrites', () => {
  it.each(['/logo-conveniat27.png', '/favicon.ico', '/sw.js.map', '/manifest.webmanifest'])(
    'excludes the static asset %s',
    (pathname) => {
      expect(isExcludedFromPathRewrites(requestFor(pathname))).toBe(true);
    },
  );

  /**
   * A missing extension does not 404 — the i18n rewrite turns the request into a page route
   * and the asset comes back as an HTML document, so the image silently never paints (#1657).
   */
  it('excludes .webp assets such as the pre-blurred background logo', () => {
    expect(isExcludedFromPathRewrites(requestFor('/background-logo-blurred.webp'))).toBe(true);
  });

  it('does not exclude page routes', () => {
    expect(isExcludedFromPathRewrites(requestFor('/de/anlaesse'))).toBe(false);
  });
});
