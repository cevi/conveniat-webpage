import { isUnhandledMultipartPost } from '@/proxy/utils/is-unhandled-multipart-post';
import type { NextRequest } from 'next/server';

const requestFor = (config: {
  pathname: string;
  method?: string;
  headers?: Record<string, string>;
}): NextRequest =>
  ({
    method: config.method ?? 'POST',
    nextUrl: { pathname: config.pathname },
    headers: new Headers(config.headers ?? {}),
  }) as unknown as NextRequest;

const multipart = { 'content-type': 'multipart/form-data; boundary=----WebKitFormBoundaryAbC' };

describe('isUnhandledMultipartPost', () => {
  /**
   * A scanner posting a malformed body to a CMS page URL made Next.js throw inside its
   * own form parser, before any route code ran (#1559).
   */
  it('rejects a multipart post to a page route', () => {
    expect(
      isUnhandledMultipartPost(requestFor({ pathname: '/de/anlaesse', headers: multipart })),
    ).toBe(true);
  });

  it('accepts a Server Function call, which carries a next-action header', () => {
    expect(
      isUnhandledMultipartPost(
        requestFor({
          pathname: '/de/anlaesse',
          headers: { ...multipart, 'next-action': 'abc123' },
        }),
      ),
    ).toBe(false);
  });

  it.each(['/api/form-upload', '/api/media', '/admin/collections/media/create'])(
    'accepts the multipart upload to %s',
    (pathname) => {
      expect(isUnhandledMultipartPost(requestFor({ pathname, headers: multipart }))).toBe(false);
    },
  );

  it('accepts a urlencoded post, which Next.js never parses itself', () => {
    expect(
      isUnhandledMultipartPost(
        requestFor({
          pathname: '/de/anlaesse',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
        }),
      ),
    ).toBe(false);
  });

  it('accepts a GET of a page route', () => {
    expect(
      isUnhandledMultipartPost(
        requestFor({ pathname: '/de/anlaesse', method: 'GET', headers: {} }),
      ),
    ).toBe(false);
  });
});
