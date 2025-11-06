import type { ChainedMiddleware } from '@/middleware/middleware-chain';
import { withAuthenticationRedirect } from '@/middleware/with-authentication-redirect';
import type { NextFetchEvent } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Helper to create a mock NextRequest
 * @param pathname - The pathname for the request (e.g., '/en/about')
 * @param cookies - A map of cookies { name: value }
 * @param search - The search string for the URL (e.g., '?foo=bar')
 * @returns A mocked NextRequest
 */
const createMockRequest = (
  pathname: string,
  cookies: { [key: string]: string } = {},
  search: string = '',
): NextRequest => {
  const url = `http://localhost:3000${pathname}${search}`;
  const request = new NextRequest(url);

  // Mock cookies.get()
  request.cookies.get = jest.fn((name: string) => {
    if (cookies[name] !== undefined) {
      return { name, value: cookies[name] };
    }
    return;
  });

  // Mock cookies.has() - This is used by the middleware
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

describe('withAuthenticationRedirect', () => {
  let mockNextMiddleware: jest.Mock<ReturnType<ChainedMiddleware>, Parameters<ChainedMiddleware>>;
  let mockEvent: NextFetchEvent;
  let initialResponse: NextResponse;
  let mockConsoleError: jest.SpyInstance;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Create a mock "next" middleware function in the chain.
    mockNextMiddleware = jest.fn((_request, _event, response) => {
      return response ?? NextResponse.next();
    });

    mockEvent = createMockEvent();
    initialResponse = NextResponse.next();

    // Mock console.error to spy on it and suppress logs during tests
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore the original console.error function
    mockConsoleError.mockRestore();
  });

  it('should redirect unauthenticated user to /login when visiting a protected route', async () => {
    // Arrange
    const request = createMockRequest('/app/chat'); // No cookies
    const middleware = withAuthenticationRedirect(mockNextMiddleware);

    // Act
    const result = await middleware(request, mockEvent, initialResponse);

    // Assert
    expect(result?.status).toBe(307);
    expect(result?.headers.get('location')).toBe(
      'http://localhost:3000/login?redirect-back-to=%2Fapp%2Fchat',
    );
    expect(mockNextMiddleware).not.toHaveBeenCalled();
  });

  it('should redirect unauthenticated user and include original search params in redirect-back-to', async () => {
    // Arrange
    const request = createMockRequest(
      '/app/schedule',
      {},
      '?some-param=some-value&another-param=another-value',
    ); // No cookies
    const middleware = withAuthenticationRedirect(mockNextMiddleware);

    // Act
    const result = await middleware(request, mockEvent, initialResponse);

    // Assert
    expect(result?.status).toBe(307);
    expect(result?.headers.get('location')).toBe(
      'http://localhost:3000/login?redirect-back-to=%2Fapp%2Fschedule%3Fsome-param%3Dsome-value%26another-param%3Danother-value',
    );
    expect(mockNextMiddleware).not.toHaveBeenCalled();
  });

  it('should call next middleware for unauthenticated user on a public route', async () => {
    // Arrange
    const request = createMockRequest('/about'); // No cookies
    const middleware = withAuthenticationRedirect(mockNextMiddleware);

    // Act
    const result = await middleware(request, mockEvent, initialResponse);

    // Assert
    expect(result).toBe(initialResponse); // Passed to next middleware
    expect(mockNextMiddleware).toHaveBeenCalledWith(request, mockEvent, initialResponse);
  });

  it('should call next middleware for unauthenticated user on /login route', async () => {
    // Arrange
    const request = createMockRequest('/login'); // No cookies
    const middleware = withAuthenticationRedirect(mockNextMiddleware);

    // Act
    const result = await middleware(request, mockEvent, initialResponse);

    // Assert
    expect(result).toBe(initialResponse); // Passed to next middleware
    expect(mockNextMiddleware).toHaveBeenCalledWith(request, mockEvent, initialResponse);
  });

  it('should call next middleware for authenticated user on a protected route', async () => {
    // Arrange
    const request = createMockRequest('/app/chat', { 'authjs.session-token': 'token' });
    const middleware = withAuthenticationRedirect(mockNextMiddleware);

    // Act
    const result = await middleware(request, mockEvent, initialResponse);

    // Assert
    expect(result).toBe(initialResponse); // Passed to next middleware
    expect(mockNextMiddleware).toHaveBeenCalledWith(request, mockEvent, initialResponse);
  });

  it('should call next middleware for authenticated user on a public route', async () => {
    // Arrange
    const request = createMockRequest('/about', { '__Secure-authjs.session-token': 'token' });
    const middleware = withAuthenticationRedirect(mockNextMiddleware);

    // Act
    const result = await middleware(request, mockEvent, initialResponse);

    // Assert
    expect(result).toBe(initialResponse); // Passed to next middleware
    expect(mockNextMiddleware).toHaveBeenCalledWith(request, mockEvent, initialResponse);
  });

  it('should redirect authenticated user from /login to /app/dashboard if no redirect-back-to param exists', async () => {
    // Arrange
    const request = createMockRequest('/login', { 'authjs.session-token': 'token' });
    const middleware = withAuthenticationRedirect(mockNextMiddleware);

    // Act
    const result = await middleware(request, mockEvent, initialResponse);

    // Assert
    expect(result?.status).toBe(307);
    expect(result?.headers.get('location')).toBe('http://localhost:3000/app/dashboard');
    expect(mockNextMiddleware).not.toHaveBeenCalled();
  });

  it('should redirect authenticated user from /login to the path in redirect-back-to param', async () => {
    // Arrange
    const request = createMockRequest(
      '/login',
      { 'authjs.session-token': 'token' },
      '?redirect-back-to=%2Fapp%2Fsettings',
    );
    const middleware = withAuthenticationRedirect(mockNextMiddleware);

    // Act
    const result = await middleware(request, mockEvent, initialResponse);

    // Assert
    expect(result?.status).toBe(307);
    expect(result?.headers.get('location')).toBe('http://localhost:3000/app/settings');
    expect(mockNextMiddleware).not.toHaveBeenCalled();
  });

  it('should redirect authenticated user from /login to a full URL in redirect-back-to param', async () => {
    // Arrange
    const request = createMockRequest(
      '/login',
      { 'authjs.session-token': 'token' },
      '?redirect-back-to=http%3A%2F%2Flocalhost%3A3000%2Fapp%2Fschedule%3Fsome-query%3Dsome-value',
    );
    const middleware = withAuthenticationRedirect(mockNextMiddleware);

    // Act
    const result = await middleware(request, mockEvent, initialResponse);

    // Assert
    expect(result?.status).toBe(307);
    expect(result?.headers.get('location')).toBe(
      'http://localhost:3000/app/schedule?some-query=some-value',
    );
    expect(mockNextMiddleware).not.toHaveBeenCalled();
  });

  it('should fall back to /app/dashboard if redirect-back-to is an invalid URL', async () => {
    // Arrange
    const request = createMockRequest('/login', { 'authjs.session-token': 'token' });
    const middleware = withAuthenticationRedirect(mockNextMiddleware);

    // Act
    const result = await middleware(request, mockEvent, initialResponse);

    // Assert
    expect(result?.status).toBe(307);
    expect(result?.headers.get('location')).toBe('http://localhost:3000/app/dashboard');
    expect(mockConsoleError).not.toHaveBeenCalled();
    expect(mockNextMiddleware).not.toHaveBeenCalled();
  });
});
