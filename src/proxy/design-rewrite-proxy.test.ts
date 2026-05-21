import { designRewriteProxy } from '@/proxy/design-rewrite-proxy';
import { Cookie, Header } from '@/types/types';
import { DesignCodes, DesignModeTriggers } from '@/utils/design-codes';
import type { NextFetchEvent, NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@/features/payload-cms/payload-cms/locales', () => ({
  LOCALE: { EN: 'en', FR: 'fr', DE: 'de' },
}));

jest.mock('@/types/types', () => {
  const actual: object = jest.requireActual('@/types/types');
  return {
    ...actual,
    Cookie: { DESIGN_MODE: 'design-mode' },
    Header: {
      DESIGN_MODE: 'x-design-mode',
      MIDDLEWARE_REWRITES: 'x-middleware-rewrite',
    },
  };
});

const mockRewrite = jest.fn<void, [URL, NextResponse]>();
jest.spyOn(NextResponse, 'rewrite').mockImplementation((destination: string | URL) => {
  const response = {
    headers: new Headers(),
    cookies: { set: jest.fn() },
  } as unknown as NextResponse;
  mockRewrite(destination as URL, response);
  return response;
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extracts the rewritten URL pathname from the first `NextResponse.rewrite()` call.
 */
function getRewritePathname(): string {
  expect(mockRewrite).toHaveBeenCalledTimes(1);
  const firstCall = mockRewrite.mock.calls.at(0);
  if (firstCall === undefined) throw new Error('Expected rewrite to be called');
  return firstCall[0].pathname;
}

/**
 * Creates a minimal mock NextRequest with the given URL and options.
 */
function mockRequest(
  url: string,
  options: {
    headerDesign?: string;
    cookieDesign?: string;
    forceAppMode?: boolean;
    implicitAppMode?: boolean;
    appModeHeader?: boolean;
    initialAppModeCookie?: boolean;
    userAgent?: string;
    referer?: string;
  } = {},
): NextRequest & { cookies: never } {
  const requestUrl = new URL(url);

  if (options.forceAppMode === true) {
    requestUrl.searchParams.set(DesignModeTriggers.QUERY_PARAM_FORCE, 'true');
  }
  if (options.implicitAppMode === true) {
    requestUrl.searchParams.set(DesignModeTriggers.QUERY_PARAM_IMPLICIT, 'true');
  }

  const headers = new Map<string, string>();
  if (options.headerDesign !== undefined) headers.set(Header.DESIGN_MODE, options.headerDesign);
  if (options.appModeHeader === true) headers.set(DesignModeTriggers.HEADER_IMPLICIT, 'true');
  if (options.userAgent !== undefined) headers.set('user-agent', options.userAgent);
  if (options.referer !== undefined) headers.set('referer', options.referer);

  return {
    url: requestUrl.toString(),
    nextUrl: requestUrl,
    headers: {
      get: (name: string): string | undefined => headers.get(name) ?? undefined,
    },
    cookies: {
      get: jest.fn((name: string) => {
        if (name === (Cookie.DESIGN_MODE as string) && options.cookieDesign !== undefined) {
          return { value: options.cookieDesign };
        }
        if (name === 'x-app-mode-initial' && options.initialAppModeCookie === true) {
          return { value: 'true' };
        }
        return;
      }),
    },
  } as unknown as NextRequest & { cookies: never };
}

/**
 * Creates a mock response that simulates a previous proxy in the chain
 * having set the x-middleware-rewrite header.
 */
function mockResponse(rewriteUrl?: string): NextResponse<unknown> {
  const headers = new Headers();
  if (rewriteUrl !== undefined) {
    headers.set(Header.MIDDLEWARE_REWRITES, rewriteUrl);
  }
  return {
    headers,
    cookies: { set: jest.fn() },
  } as unknown as NextResponse<unknown>;
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe('design-rewrite-proxy', () => {
  const mockNext = jest.fn();
  const handler = designRewriteProxy(mockNext);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // Baseline: Default behaviour (no triggers)
  // -----------------------------------------------------------------------

  it('defaults to WEB_DESIGN when no triggers are present', async () => {
    const request = mockRequest('https://example.com/about');
    const response = mockResponse();

    await handler(request, {} as NextFetchEvent, response);

    const pathname = getRewritePathname();
    expect(pathname).toContain(DesignCodes.WEB_DESIGN);
    expect(pathname).not.toContain(DesignCodes.APP_DESIGN);
  });

  // -----------------------------------------------------------------------
  // BUG REPRODUCTION: /~offline used to force APP_DESIGN for all users
  // -----------------------------------------------------------------------

  /**
   * Reproduces the original bug from PostHog issue #1186.
   * @see https://github.com/cevi/conveniat-webpage/issues/1186
   *
   * Before the fix, the proxy had `isOfflinePage` as a trigger that
   * unconditionally forced APP_DESIGN for any request to /~offline.
   * This meant that a regular web user who went offline and got redirected
   * to /~offline would be served the App layout, causing:
   *   1. A layout mismatch (WEB_DESIGN → APP_DESIGN)
   *   2. React Error #310 ("Rendered more hooks than during the previous render")
   *      when navigating back, because the component tree changed radically.
   */
  it('does NOT force APP_DESIGN for /~offline when user has no app-mode triggers', async () => {
    const request = mockRequest('https://example.com/~offline');
    const response = mockResponse();

    await handler(request, {} as NextFetchEvent, response);

    const pathname = getRewritePathname();
    // The offline page should be rendered in WEB_DESIGN for regular web users
    expect(pathname).toContain(DesignCodes.WEB_DESIGN);
    expect(pathname).not.toContain(DesignCodes.APP_DESIGN);
  });

  it('does NOT force APP_DESIGN for locale-prefixed /~offline requests', async () => {
    const request = mockRequest('https://example.com/~offline');
    const response = mockResponse('https://example.com/de/~offline');

    await handler(request, {} as NextFetchEvent, response);

    const pathname = getRewritePathname();
    expect(pathname).toContain(DesignCodes.WEB_DESIGN);
    expect(pathname).not.toContain(DesignCodes.APP_DESIGN);
  });

  // -----------------------------------------------------------------------
  // FIX VERIFICATION: /~offline in app mode still gets APP_DESIGN
  // -----------------------------------------------------------------------

  it('uses APP_DESIGN for /~offline when Service Worker injects x-app-mode header', async () => {
    const request = mockRequest('https://example.com/~offline', {
      appModeHeader: true,
    });
    const response = mockResponse();

    await handler(request, {} as NextFetchEvent, response);

    expect(getRewritePathname()).toContain(DesignCodes.APP_DESIGN);
  });

  it('uses APP_DESIGN for /~offline when app-mode query param is present', async () => {
    const request = mockRequest('https://example.com/~offline', {
      implicitAppMode: true,
    });
    const response = mockResponse();

    await handler(request, {} as NextFetchEvent, response);

    expect(getRewritePathname()).toContain(DesignCodes.APP_DESIGN);
  });

  it('uses APP_DESIGN for /~offline when native app user-agent is present', async () => {
    const request = mockRequest('https://example.com/~offline', {
      userAgent: 'Mozilla/5.0 KonektaApp/1.0',
    });
    const response = mockResponse();

    await handler(request, {} as NextFetchEvent, response);

    expect(getRewritePathname()).toContain(DesignCodes.APP_DESIGN);
  });

  // -----------------------------------------------------------------------
  // Standard app-mode triggers still work for non-offline pages
  // -----------------------------------------------------------------------

  it('uses APP_DESIGN when force-app-mode query param is set', async () => {
    const request = mockRequest('https://example.com/entrypoint', {
      forceAppMode: true,
    });
    const response = mockResponse();

    await handler(request, {} as NextFetchEvent, response);

    expect(getRewritePathname()).toContain(DesignCodes.APP_DESIGN);
  });

  it('uses APP_DESIGN when implicit app-mode query param is set', async () => {
    const request = mockRequest('https://example.com/entrypoint', {
      implicitAppMode: true,
    });
    const response = mockResponse();

    await handler(request, {} as NextFetchEvent, response);

    expect(getRewritePathname()).toContain(DesignCodes.APP_DESIGN);
  });

  it('uses APP_DESIGN when x-app-mode header is present', async () => {
    const request = mockRequest('https://example.com/app/dashboard', {
      appModeHeader: true,
    });
    const response = mockResponse();

    await handler(request, {} as NextFetchEvent, response);

    expect(getRewritePathname()).toContain(DesignCodes.APP_DESIGN);
  });

  it('uses APP_DESIGN when x-app-mode-initial cookie is set', async () => {
    const request = mockRequest('https://example.com/app/schedule', {
      initialAppModeCookie: true,
    });
    const response = mockResponse();

    await handler(request, {} as NextFetchEvent, response);

    expect(getRewritePathname()).toContain(DesignCodes.APP_DESIGN);
  });

  it('uses APP_DESIGN when KonektaApp user-agent is detected', async () => {
    const request = mockRequest('https://example.com/app/dashboard', {
      userAgent: 'Mozilla/5.0 KonektaApp/1.0',
    });
    const response = mockResponse();

    await handler(request, {} as NextFetchEvent, response);

    expect(getRewritePathname()).toContain(DesignCodes.APP_DESIGN);
  });

  // -----------------------------------------------------------------------
  // Referer-based app mode for /app/dashboard
  // -----------------------------------------------------------------------

  it('uses APP_DESIGN for /app/dashboard when referer is /entrypoint with app-mode', async () => {
    const request = mockRequest('https://example.com/app/dashboard', {
      referer: 'https://example.com/entrypoint?app-mode=true',
    });
    const response = mockResponse('https://example.com/de/app/dashboard');

    await handler(request, {} as NextFetchEvent, response);

    expect(getRewritePathname()).toContain(DesignCodes.APP_DESIGN);
  });

  it('does NOT trigger app mode for /app/dashboard with unrelated referer', async () => {
    const request = mockRequest('https://example.com/app/dashboard', {
      referer: 'https://example.com/about',
    });
    const response = mockResponse('https://example.com/de/app/dashboard');

    await handler(request, {} as NextFetchEvent, response);

    expect(getRewritePathname()).toContain(DesignCodes.WEB_DESIGN);
  });

  // -----------------------------------------------------------------------
  // Design header/cookie precedence
  // -----------------------------------------------------------------------

  it('uses header design when set', async () => {
    const request = mockRequest('https://example.com/about', {
      headerDesign: DesignCodes.APP_DESIGN,
    });
    const response = mockResponse();

    await handler(request, {} as NextFetchEvent, response);

    // Header design takes precedence as the initial value
    const designHeader = response.headers.get(Header.DESIGN_MODE);
    expect(designHeader).toBe(DesignCodes.APP_DESIGN);
  });

  it('uses cookie design when header is absent', async () => {
    const request = mockRequest('https://example.com/about', {
      cookieDesign: DesignCodes.APP_DESIGN,
    });
    const response = mockResponse();

    await handler(request, {} as NextFetchEvent, response);

    const designHeader = response.headers.get(Header.DESIGN_MODE);
    expect(designHeader).toBe(DesignCodes.APP_DESIGN);
  });
});
