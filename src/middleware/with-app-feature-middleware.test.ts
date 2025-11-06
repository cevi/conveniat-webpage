import { environmentVariables } from '@/config/environment-variables';
import type { ChainedMiddleware } from '@/middleware/middleware-chain';
import { isExcludedFromPathRewrites } from '@/middleware/utils/is-excluded-from-path-rewrites';
import { withAppFeatureMiddleware } from '@/middleware/with-app-feature-middleware';
import { Cookie } from '@/types/types';
import type { NextFetchEvent } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';

// --- Mocks ---

// Mock environment variables
jest.mock('@/config/environment-variables', () => ({
  environmentVariables: {
    FEATURE_ENABLE_APP_FEATURE: true, // Default to enabled for most tests
  },
}));

// Mock the exclusion utility
jest.mock('@/middleware/utils/is-excluded-from-path-rewrites', () => ({
  isExcludedFromPathRewrites: jest.fn(),
}));

// Mock types/config
jest.mock('@/types/types', () => ({
  i18nConfig: {
    locales: ['en', 'de', 'fr'],
    defaultLocale: 'de',
  },
  Cookie: {
    APP_DESIGN: 'app-design',
    CONVENIAT_COOKIE_BANNER: 'conveniat-cookie-banner',
  },
  DesignCodes: {
    APP_DESIGN: 'design-mode-app',
    WEB_DESIGN: 'design-mode-web',
  },
}));

// --- Type Helpers for Mocks ---
const mockedIsExcluded = isExcludedFromPathRewrites as jest.Mock;
const mockedEnvironment = environmentVariables as { FEATURE_ENABLE_APP_FEATURE: boolean };

// --- Test Helpers ---

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
    return; // Explicitly return undefined
  });

  // Mock cookies.has()
  request.cookies.has = jest.fn((name: string) => {
    return cookies[name] !== undefined;
  });

  return request;
};

// Helper to create a mock NextFetchEvent
const createMockEvent = (): NextFetchEvent => {
  return {
    waitUntil: jest.fn(),
  } as unknown as NextFetchEvent;
};

describe('withAppFeatureMiddleware', () => {
  let mockNextMiddleware: jest.Mock<ReturnType<ChainedMiddleware>, Parameters<ChainedMiddleware>>;
  let mockEvent: NextFetchEvent;

  beforeEach(() => {
    jest.clearAllMocks();
    // A realistic mock simply returns the response it's given
    mockNextMiddleware = jest.fn((_request, _event, response) => response ?? NextResponse.next());
    mockEvent = createMockEvent();

    // Default mock states
    mockedIsExcluded.mockReturnValue(false);
    mockedEnvironment.FEATURE_ENABLE_APP_FEATURE = true; // Default to enabled
  });

  // --- 1. Exclusion Check ---
  describe('Exclusion Checks', () => {
    it('should skip all logic and call next middleware if path is excluded', async () => {
      // Arrange
      const request = createMockRequest('/api/health');
      const response = NextResponse.next();
      mockedIsExcluded.mockReturnValue(true);
      const middleware = withAppFeatureMiddleware(mockNextMiddleware);

      // Act
      const result = await middleware(request, mockEvent, response);

      // Assert
      expect(result).toBe(response);
      expect(mockNextMiddleware).toHaveBeenCalledWith(request, mockEvent, response);
    });
  });

  // --- 2. Design Rewrite Logic ---
  describe('Design Path Rewrite Logic', () => {
    it('should rewrite path with /design-mode-web/ for default design (no cookie) and no locale', () => {
      // Arrange
      const request = createMockRequest('/about'); // No cookies
      const response = NextResponse.next();
      const middleware = withAppFeatureMiddleware(mockNextMiddleware);

      // Act
      const result = middleware(request, mockEvent, response) as NextResponse;

      // Assert
      // Check the rewrite URL

      const rewriteHeader = result.headers.get('x-middleware-rewrite');
      expect(rewriteHeader).toBe('http://localhost:3000/de/design-mode-web/about');

      // Check that the *request* passed to the *next* middleware is the original
      const nextRequest = mockNextMiddleware.mock.calls[0]?.[0];
      expect(nextRequest?.url).toBe('http://localhost:3000/about');

      // Check that the *response* passed to the *next* middleware is the new rewrite response
      const nextResponse = mockNextMiddleware.mock.calls[0]?.[2];
      expect(nextResponse).toBe(result);
    });

    it('should rewrite path with /design-mode-app/ when APP_DESIGN cookie is "true" and no locale', () => {
      // Arrange
      const request = createMockRequest('/dashboard', { [Cookie.APP_DESIGN]: 'true' });
      const response = NextResponse.next();
      const middleware = withAppFeatureMiddleware(mockNextMiddleware);

      // Act
      const result = middleware(request, mockEvent, response) as NextResponse;

      // Assert
      const rewriteHeader = result.headers.get('x-middleware-rewrite');
      expect(rewriteHeader).toBe('http://localhost:3000/de/design-mode-app/dashboard');
    });

    it('should rewrite path with /design-mode-web/ when APP_DESIGN cookie is "false" and locale exists', () => {
      // Arrange
      const request = createMockRequest('/en/contact', { [Cookie.APP_DESIGN]: 'false' });
      const response = NextResponse.next();
      const middleware = withAppFeatureMiddleware(mockNextMiddleware);

      // Act
      const result = middleware(request, mockEvent, response) as NextResponse;

      // Assert
      const rewriteHeader = result.headers.get('x-middleware-rewrite');
      expect(rewriteHeader).toBe('http://localhost:3000/en/design-mode-web/contact');
    });

    it('should rewrite path with /design-mode-app/ when APP_DESIGN cookie is "true" and locale exists', () => {
      // Arrange
      const request = createMockRequest('/fr/profile', { [Cookie.APP_DESIGN]: 'true' });
      const response = NextResponse.next();
      const middleware = withAppFeatureMiddleware(mockNextMiddleware);

      // Act
      const result = middleware(request, mockEvent, response) as NextResponse;

      // Assert
      const rewriteHeader = result.headers.get('x-middleware-rewrite');
      expect(rewriteHeader).toBe('http://localhost:3000/fr/design-mode-app/profile');
    });

    it('should NOT rewrite path if design code /design-mode-app/ is already present', () => {
      // Arrange
      const request = createMockRequest('/de/design-mode-app/dashboard', {
        [Cookie.APP_DESIGN]: 'true',
      });
      const response = NextResponse.next();
      const middleware = withAppFeatureMiddleware(mockNextMiddleware);

      // Act
      const result = middleware(request, mockEvent, response) as NextResponse;

      // Assert
      expect(result.headers.has('x-middleware-rewrite')).toBe(false);
      expect(mockNextMiddleware).not.toHaveBeenCalled();
    });

    it('should NOT rewrite path if design code /design-mode-web/ is already present', () => {
      // Arrange
      const request = createMockRequest('/en/design-mode-web/about'); // No cookie
      const response = NextResponse.next();
      const middleware = withAppFeatureMiddleware(mockNextMiddleware);

      // Act
      const result = middleware(request, mockEvent, response) as NextResponse;

      // Assert
      expect(result.headers.has('x-middleware-rewrite')).toBe(false);
      expect(mockNextMiddleware).toHaveBeenCalled();
    });

    it('should correctly handle trailing slashes when rewriting', () => {
      // Arrange
      const request = createMockRequest('/en/contact/', { [Cookie.APP_DESIGN]: 'false' });
      const response = NextResponse.next();
      const middleware = withAppFeatureMiddleware(mockNextMiddleware);

      // Act
      const result = middleware(request, mockEvent, response) as NextResponse;

      // Assert
      const rewriteHeader = result.headers.get('x-middleware-rewrite');
      expect(rewriteHeader).toBe('http://localhost:3000/en/design-mode-web/contact/');
    });

    it('should correctly handle root path ("/") rewrite', () => {
      // Arrange
      const request = createMockRequest('/', { [Cookie.APP_DESIGN]: 'true' });
      const response = NextResponse.next();
      const middleware = withAppFeatureMiddleware(mockNextMiddleware);

      // Act
      const result = middleware(request, mockEvent, response) as NextResponse;

      // Assert
      const rewriteHeader = result.headers.get('x-middleware-rewrite');
      expect(rewriteHeader).toBe('http://localhost:3000/de/design-mode-app/');
    });

    it('should preserve cookies from initial response when rewriting', () => {
      // Arrange
      const request = createMockRequest('/about'); // No cookies
      const response = NextResponse.next();
      response.cookies.set('existing-cookie', 'value123'); // Set a cookie on the response
      const middleware = withAppFeatureMiddleware(mockNextMiddleware);

      // Act
      const result = middleware(request, mockEvent, response) as NextResponse;

      // Assert
      const rewriteHeader = result.headers.get('x-middleware-rewrite');
      expect(rewriteHeader).toBe('http://localhost:3000/de/design-mode-web/about');

      // Check that the new response object contains the old cookie
      const setCookieHeader = result.headers.get('set-cookie');
      expect(setCookieHeader).toContain('existing-cookie=value123');
    });
  });

  // --- 3. Feature Flag: ENABLED ---
  describe('App Features ENABLED', () => {
    beforeEach(() => {
      mockedEnvironment.FEATURE_ENABLE_APP_FEATURE = true;
    });

    it('should redirect to /entrypoint if in app design, cookies not accepted, and not at entrypoint', () => {
      // Arrange
      // This request will NOT be rewritten, so it passes to applyMiddlewareForAppFeatures
      const request = createMockRequest('/de/design-mode-app/dashboard', {
        [Cookie.APP_DESIGN]: 'true',
      }); // No cookie banner
      const response = NextResponse.next();
      const middleware = withAppFeatureMiddleware(mockNextMiddleware);

      // Act
      const result = middleware(request, mockEvent, response) as NextResponse;

      // Assert
      expect(result.status).toBe(307);
      expect(result.headers.get('location')).toBe('http://localhost:3000/entrypoint');
      expect(mockNextMiddleware).not.toHaveBeenCalled();
    });

    it('should redirect to /app/dashboard if in app design, cookies ARE accepted, and at entrypoint', () => {
      // Arrange
      const request = createMockRequest('/entrypoint', {
        [Cookie.APP_DESIGN]: 'true',
        [Cookie.CONVENIAT_COOKIE_BANNER]: 'true',
      });
      // Path will be rewritten to /de/design-mode-app/entrypoint, but that's ok,
      // the request object passed to applyMiddlewareForAppFeatures is the *original* one.
      const response = NextResponse.next();
      const middleware = withAppFeatureMiddleware(mockNextMiddleware);

      // Act
      const result = middleware(request, mockEvent, response) as NextResponse;

      // Assert
      expect(result.status).toBe(307);
      expect(result.headers.get('location')).toBe('http://localhost:3000/app/dashboard');
      expect(mockNextMiddleware).not.toHaveBeenCalled();
    });

    it('should call next middleware if in app design, cookies accepted, and NOT at entrypoint', () => {
      // Arrange
      const request = createMockRequest('/de/design-mode-app/dashboard', {
        [Cookie.APP_DESIGN]: 'true',
        [Cookie.CONVENIAT_COOKIE_BANNER]: 'true',
      });
      const response = NextResponse.next();
      const middleware = withAppFeatureMiddleware(mockNextMiddleware);

      // Act
      const result = middleware(request, mockEvent, response) as NextResponse;

      // Assert
      expect(result).toBe(response);
      expect(mockNextMiddleware).toHaveBeenCalledWith(request, mockEvent, response);
    });

    it('should call next middleware if in WEB design (bypassing app logic)', () => {
      // Arrange
      const request = createMockRequest('/de/design-mode-web/about', {
        [Cookie.CONVENIAT_COOKIE_BANNER]: 'true',
      }); // Not in app design
      const response = NextResponse.next();
      const middleware = withAppFeatureMiddleware(mockNextMiddleware);

      // Act
      const result = middleware(request, mockEvent, response) as NextResponse;

      // Assert
      expect(result).toBe(response);
      expect(mockNextMiddleware).toHaveBeenCalledWith(request, mockEvent, response);
    });
  });

  // --- 4. Feature Flag: DISABLED ---
  describe('App Features DISABLED', () => {
    beforeEach(() => {
      mockedEnvironment.FEATURE_ENABLE_APP_FEATURE = false;
    });

    it('should redirect /entrypoint to /', () => {
      // Arrange
      const request = createMockRequest('/entrypoint');
      // This path will be rewritten to /de/design-mode-web/entrypoint first
      const response = NextResponse.next();
      const middleware = withAppFeatureMiddleware(mockNextMiddleware);

      // Act
      const result = middleware(request, mockEvent, response) as NextResponse;

      // Assert
      expect(result.status).toBe(307);
      expect(result.headers.get('location')).toBe('http://localhost:3000/');
      expect(mockNextMiddleware).not.toHaveBeenCalled();
    });

    it('should redirect /design-mode-app/dashboard to /', () => {
      // Arrange
      const request = createMockRequest('/de/design-mode-app/dashboard'); // Path includes 'app'
      const response = NextResponse.next();
      const middleware = withAppFeatureMiddleware(mockNextMiddleware);

      // Act
      const result = middleware(request, mockEvent, response) as NextResponse;

      // Assert
      expect(result.status).toBe(307);
      expect(result.headers.get('location')).toBe('http://localhost:3000/');
      expect(mockNextMiddleware).not.toHaveBeenCalled();
    });

    it('should delete APP_DESIGN cookie if it exists', () => {
      // Arrange
      const request = createMockRequest('/de/design-mode-web/about', {
        [Cookie.APP_DESIGN]: 'true',
      });
      const response = NextResponse.next();
      const middleware = withAppFeatureMiddleware(mockNextMiddleware);

      // Act
      const result = middleware(request, mockEvent, response) as NextResponse;

      // Assert
      // Check that the response *passed to the next middleware* has the delete instruction
      const nextResponse = mockNextMiddleware.mock.calls[0]?.[2];
      const cookieHeader = nextResponse?.headers.get('set-cookie');
      expect(cookieHeader).toContain('app-design=');

      expect(mockNextMiddleware).toHaveBeenCalled(); // Should continue
      expect(result).toBe(nextResponse);
    });

    it('should call next middleware for a normal /design-mode-web/ path', async () => {
      // Arrange
      const request = createMockRequest('/de/design-mode-web/contact');
      const response = NextResponse.next();
      const middleware = withAppFeatureMiddleware(mockNextMiddleware);

      // Act
      const result = (await middleware(request, mockEvent, response)) as NextResponse;

      // Assert
      expect(result.url).toBe(response.url);
      expect(mockNextMiddleware).toHaveBeenCalledWith(
        request,
        mockEvent,
        expect.objectContaining({ url: response.url }),
      );
    });
  });
});
