import { getLocaleFromUrl } from '@/proxy/utils/get-locale-from-url';
import { Header } from '@/types/types';
import type { NextRequest, NextResponse } from 'next/server';

jest.mock('@/types/types', () => ({
  i18nConfig: {
    locales: {
      ENGLISH: 'en',
      GERMAN: 'de',
      FRENCH: 'fr',
    },
    defaultLocale: 'en',
  },
  Header: {
    MIDDLEWARE_REWRITES: 'x-middleware-rewrite',
  },
}));

interface MockNextRequest {
  url: string;
}

interface MockNextResponse {
  headers: { get: (key: string) => string | null };
}

const mockResponse = (rewriteUrl?: string | null): MockNextResponse =>
  ({
    headers: {
      get: jest.fn((header: string) => {
        if (header === (Header.MIDDLEWARE_REWRITES as string)) {
          // eslint-disable-next-line unicorn/no-null
          return rewriteUrl ?? null; // Rewritten URL
        }
        // eslint-disable-next-line unicorn/no-null
        return null;
      }),
    },
  }) as MockNextResponse;

describe('getLocaleFromUrl', () => {
  /**
   * Test cases: Valid Locale Returned Correctly
   *
   * Given a url with a valid locale segment at the start of the path,
   * this test verifies that the function correctly identifies and returns
   * the locale.
   *
   */

  it('Valid Locale Returned Correctly', () => {
    const request = {
      url: 'https://example.com/de/some-page',
    } as MockNextRequest;

    const response = mockResponse();

    const locale = getLocaleFromUrl(request as NextRequest, response as NextResponse);
    expect(locale).toBe('de');
  });

  /**
   * Test cases: Locale from Rewrite URL
   *
   * Given a request and response where the response contains a rewritten URL
   * with a valid locale segment, this test verifies that the function correctly
   * extracts and returns the locale from the rewritten URL.
   *
   */
  it('Locale from Rewrite URL', () => {
    const request = {
      url: 'https://example.com/some-page', // Original request might not have locale
    } as MockNextRequest;

    const response = mockResponse('https://example.com/fr/some-page');

    const locale = getLocaleFromUrl(request as NextRequest, response as NextResponse);
    expect(locale).toBe('fr');
    expect(response.headers.get).toHaveBeenCalledWith(Header.MIDDLEWARE_REWRITES);
  });

  /**
   * Test cases: No Locale Segment Present Returns Undefined
   *
   * Given a url without any locale segment in the path,
   * this test verifies that the function returns undefined,
   * indicating that no valid locale was found.
   *
   */
  it('No Locale Segment Present Returns Undefined', () => {
    const request = {
      url: 'https://example.com/some-page/without-locale',
    } as MockNextRequest;

    const response = mockResponse();

    const locale = getLocaleFromUrl(request as NextRequest, response as NextResponse);
    expect(locale).toBeUndefined();
  });

  /**
   * Test cases: Invalid Locale Segment Returns Undefined
   *
   * Given a url with an invalid locale segment at the start of the path,
   * this test verifies that the function returns undefined,
   * indicating that the locale segment is not recognized as valid.
   *
   */
  it('Invalid Locale Segment Returns Undefined', () => {
    const request = {
      url: 'https://example.com/es/some-page', // 'es' is not in our mock i18nConfig
    } as MockNextRequest;

    const response = mockResponse();

    const locale = getLocaleFromUrl(request as NextRequest, response as NextResponse);
    expect(locale).toBeUndefined();
  });

  it('should return undefined for the root path', () => {
    const request = {
      url: 'https://example.com/',
    } as MockNextRequest;

    const response = mockResponse();

    const locale = getLocaleFromUrl(request as NextRequest, response as NextResponse);
    expect(locale).toBeUndefined();
  });

  /**
   * Test cases: Handles URLs with Trailing Slashes
   *
   * Given a url with a valid locale segment followed by a trailing slash,
   * this test verifies that the function correctly identifies and returns
   * the locale, ignoring the trailing slash.
   *
   */
  it('Handles URLs with Trailing Slashes', () => {
    const request = {
      url: 'https://example.com/en/',
    } as MockNextRequest;

    const response = mockResponse();

    const locale = getLocaleFromUrl(request as NextRequest, response as NextResponse);
    expect(locale).toBe('en');
  });

  /**
   * Test cases: Only Checks First Path Segment
   *
   * Given a url where the first path segment is not a valid locale
   * but a subsequent segment is, this test verifies that the function
   * only considers the first segment and returns undefined.
   *
   */
  it('Only Checks First Path Segment', () => {
    const request = {
      url: 'https://example.com/not-a-locale/de/some-page',
    } as MockNextRequest;

    const response = mockResponse();

    // It finds 'not-a-locale', which is invalid, and stops. It does not find 'de'.
    const locale = getLocaleFromUrl(request as NextRequest, response as NextResponse);
    expect(locale).toBeUndefined();
  });

  /**
   * Test cases: Prefer Rewrite URL Over Request URL
   *
   * Given a request and response where both the original request URL
   * and the rewritten URL contain valid locale segments, this test
   * verifies that the function prioritizes the locale from the
   * rewritten URL.
   *
   */
  it('Prefer Rewrite URL Over Request URL', () => {
    const request = {
      url: 'https://example.com/en/some-page', // Original request
    } as MockNextRequest;

    const response = mockResponse('https://example.com/de/some-other-page');

    const locale = getLocaleFromUrl(request as NextRequest, response as NextResponse);
    expect(locale).toBe('de'); // Prefers 'de' from rewrite
  });
});
