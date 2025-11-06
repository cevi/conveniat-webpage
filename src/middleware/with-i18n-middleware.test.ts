import type { ChainedMiddleware } from '@/middleware/middleware-chain';
import { isExcludedFromPathRewrites } from '@/middleware/utils/is-excluded-from-path-rewrites';
import { withI18nMiddleware } from '@/middleware/with-i18n-middleware';
import { i18nRouter } from 'next-i18n-router';
import type { NextFetchEvent } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';

// Mock next-i18n-router
jest.mock('next-i18n-router', () => ({
  i18nRouter: jest.fn(),
}));

// Mock the utility function
jest.mock('@/middleware/utils/is-excluded-from-path-rewrites', () => ({
  isExcludedFromPathRewrites: jest.fn(),
}));

// Mock the config
// This is now automatically mocked by jest.config.js or manual mock,
// but we import it to pass to i18nRouter mock
jest.mock('@/types/types', () => ({
  i18nConfig: {
    locales: ['en', 'de', 'fr'],
    defaultLocale: 'de',
  },
  DesignCodes: {
    APP_DESIGN: 'app',
    WEB_DESIGN: 'web',
  },
}));

// --- Type Helpers for Mocks ---
const mockedI18nRouter = i18nRouter as jest.Mock;
const mockedIsExcludedFromPathRewrites = isExcludedFromPathRewrites as jest.Mock;

/**
 * Helper to create a mock NextRequest
 * @param pathname - The pathname for the request (e.g., '/en/about')
 * @param cookies - A map of cookies { name: value }
 * @returns A mocked NextRequest
 */
const createMockRequest = (
  pathname: string,
  cookies: { [key: string]: string } = {},
): NextRequest => {
  const url = `http://localhost:3000${pathname}`;
  const request = new NextRequest(url);

  // Mock cookies.get()
  request.cookies.get = jest.fn((name: string) => {
    if (cookies[name] !== undefined) {
      return { name, value: cookies[name] };
    }
    return;
  });

  return request;
};

// Helper to create a mock NextFetchEvent
const createMockEvent = (): NextFetchEvent => {
  return {
    waitUntil: jest.fn(),
  } as unknown as NextFetchEvent;
};

describe('withI18nMiddleware', () => {
  let mockNextMiddleware: jest.Mock<ReturnType<ChainedMiddleware>, Parameters<ChainedMiddleware>>;
  let mockEvent: NextFetchEvent;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Create a mock "next" middleware function in the chain.
    // A realistic chain-able middleware returns the response it's given.
    mockNextMiddleware = jest.fn((_request, _event, response) => {
      return response ?? NextResponse.next();
    });

    mockEvent = createMockEvent();

    // Default mock for i18nRouter: returns a simple "pass-through" response.
    // Tests that expect redirects MUST override this implementation.
    mockedI18nRouter.mockImplementation(() => {
      return NextResponse.next();
    });

    // Default mock for the exclusion utility: false
    mockedIsExcludedFromPathRewrites.mockReturnValue(false);
  });

  it('should skip i18n routing if path is excluded', () => {
    // Arrange
    const request = createMockRequest('/api/some-route');
    const initialResponse = NextResponse.next();
    mockedIsExcludedFromPathRewrites.mockReturnValue(true);

    const middleware = withI18nMiddleware(mockNextMiddleware);

    // Act
    const result = middleware(request, mockEvent, initialResponse);

    // Assert
    expect(result).toBe(initialResponse); // Returns the *exact* same response object
  });

  it('should call i18nRouter, set NEXT_LOCALE cookie, and pass response to next middleware', () => {
    // Arrange
    const request = createMockRequest('/en/about'); // Non-default locale
    const initialResponse = NextResponse.next();
    const middleware = withI18nMiddleware(mockNextMiddleware);

    // Mock the i18nRouter response for this specific pass-through case
    const i18nResponse = NextResponse.next();
    i18nResponse.cookies.set('NEXT_LOCALE', 'en');
    mockedI18nRouter.mockReturnValue(i18nResponse);

    // Act
    const result = middleware(request, mockEvent, initialResponse);

    // Assert
    const responsePassedToNext = mockNextMiddleware.mock.calls[0]?.[2];
    expect(responsePassedToNext).toBe(i18nResponse); // It's the exact object
    expect(responsePassedToNext?.cookies.get('NEXT_LOCALE')?.value).toBe('en');
    expect(result).toBe(responsePassedToNext);
  });

  it('should return 307 redirect from i18nRouter for default locale removal', async () => {
    // Arrange
    const request = createMockRequest('/de/123'); // 'de' is defaultLocale
    const initialResponse = NextResponse.next();
    const redirectUrl = 'http://localhost:3000/123';
    const middleware = withI18nMiddleware(mockNextMiddleware);

    // Mock the i18nRouter redirect response
    mockedI18nRouter.mockReturnValue(NextResponse.redirect(new URL(redirectUrl), 307));

    // Act
    const result = await middleware(request, mockEvent, initialResponse);

    // Assert
    expect(result?.status).toBe(307);
    expect(result?.headers.get('location')).toBe(redirectUrl);
  });

  it('should return 307 redirect from i18nRouter for default locale and trailing slash removal', async () => {
    // Arrange
    const request = createMockRequest('/de/123/'); // 'de' is defaultLocale + trailing slash
    const initialResponse = NextResponse.next();
    const redirectUrl = 'http://localhost:3000/123';
    const middleware = withI18nMiddleware(mockNextMiddleware);

    // Mock the i18nRouter redirect response
    mockedI18nRouter.mockReturnValue(NextResponse.redirect(new URL(redirectUrl), 307));

    // Act
    const result = await middleware(request, mockEvent, initialResponse);

    // Assert
    expect(result).not.toBeUndefined();
    expect(result?.status).toBe(307);
    expect(result?.headers.get('location')).toBe(redirectUrl);
  });

  it('should return 301 redirect from i18nRouter for trailing slash removal (non-default locale)', async () => {
    // Arrange
    const request = createMockRequest('/en/about/'); // non-default locale + trailing slash
    const initialResponse = NextResponse.next();
    const redirectUrl = 'http://localhost:3000/en/about';
    const middleware = withI18nMiddleware(mockNextMiddleware);

    // Mock the i18nRouter redirect response
    mockedI18nRouter.mockReturnValue(NextResponse.redirect(new URL(redirectUrl), 301));

    // Act
    const result = await middleware(request, mockEvent, initialResponse);

    // Assert
    expect(result).not.toBeUndefined();
    expect(result?.status).toBe(301);
    expect(result?.headers.get('location')).toBe(redirectUrl);
  });

  it('should NOT skip i18n routing for paths containing "api" not at the start', async () => {
    // This test ensures that a path like '/de/some-page/api-docs' is NOT
    // excluded by the 'isExcludedFromPathRewrites' check (which returns false by default)
    // and is instead processed by i18nRouter, which should remove the default locale.

    // Arrange
    const request = createMockRequest('/de/some-page/api-docs');
    const initialResponse = NextResponse.next();
    const redirectUrl = 'http://localhost:3000/some-page/api-docs';
    const middleware = withI18nMiddleware(mockNextMiddleware);

    // Mock the i18nRouter redirect response
    mockedI18nRouter.mockReturnValue(NextResponse.redirect(new URL(redirectUrl), 307));

    // Act
    const result = await middleware(request, mockEvent, initialResponse);

    // Assert
    expect(mockNextMiddleware).not.toHaveBeenCalled();
    expect(result?.status).toBe(307);
    expect(result?.headers.get('location')).toBe(redirectUrl);
  });

  it('should return 307 redirect for default locale removal on a content page', async () => {
    // Arrange
    const request = createMockRequest('/de/some-page');
    const initialResponse = NextResponse.next();
    const redirectUrl = 'http://localhost:3000/some-page';
    const middleware = withI18nMiddleware(mockNextMiddleware);

    // Mock the i18nRouter redirect response
    mockedI18nRouter.mockReturnValue(NextResponse.redirect(new URL(redirectUrl), 307));

    // Act
    const result = await middleware(request, mockEvent, initialResponse);

    // Assert
    expect(result?.status).toBe(307);
    expect(result?.headers.get('location')).toBe(redirectUrl);
  });

  it('should not treat an invalid locale segment as a locale and should set default cookie', async () => {
    // Arrange
    const request = createMockRequest('/es/some-page'); // 'es' is not a configured locale
    const initialResponse = NextResponse.next();
    const middleware = withI18nMiddleware(mockNextMiddleware);

    // Mock i18nRouter response: pass-through and set default locale cookie
    const i18nResponse = NextResponse.next();
    i18nResponse.cookies.set('NEXT_LOCALE', 'de'); // 'de' is defaultLocale
    mockedI18nRouter.mockReturnValue(i18nResponse);

    // Act
    const result = await middleware(request, mockEvent, initialResponse);

    // Assert
    expect(result?.headers.get('set-cookie')).toContain('NEXT_LOCALE=de');
    expect(result?.status).toBe(200); // Pass-through
  });

  it('should redirect to non-default locale from NEXT_LOCALE cookie if no locale in URL', async () => {
    // Arrange
    const request = createMockRequest('/about', { NEXT_LOCALE: 'en' });
    const initialResponse = NextResponse.next();
    const redirectUrl = 'http://localhost:3000/en/about';
    const middleware = withI18nMiddleware(mockNextMiddleware);

    // Mock the i18nRouter redirect response
    mockedI18nRouter.mockReturnValue(
      NextResponse.redirect(new URL(redirectUrl), 307), // Locale preference redirect
    );

    // Act
    const result = await middleware(request, mockEvent, initialResponse);

    // Assert
    expect(result?.status).toBe(307);
    expect(result?.headers.get('location')).toBe(redirectUrl);
  });
});
