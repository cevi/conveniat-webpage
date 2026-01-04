import { i18nProxy } from '@/proxy/i18n-proxy';
import type { Cookie as CookieType } from '@/types/types';
import { Cookie, i18nConfig } from '@/types/types';
import type { NextFetchEvent, NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { getLocaleFromUrl } from '@/proxy/utils/get-locale-from-url';

const mockRedirect = jest.fn();
const mockNext = jest.fn();
const mockRewrite = jest.fn();
const mockCookieSet = jest.fn();

jest.mock('@/proxy/utils/get-locale-from-url', () => ({
  getLocaleFromUrl: jest.fn(),
}));

jest.mock('@/features/payload-cms/payload-cms/locales', () => ({
  LOCALE: {
    EN: 'en',
    FR: 'fr',
    DE: 'de',
  },
}));

jest.mock('@/types/types', () => {
  const actual: { Cookie: CookieType } = jest.requireActual('@/types/types');

  return {
    ...actual,

    i18nConfig: {
      localeCookie: 'NEXT_LOCALE',
      defaultLocale: 'en',
      locales: ['en', 'fr', 'de'],
    },

    Cookie: {
      LOCALE_COOKIE: 'NEXT_LOCALE',
    },

    Header: {
      MIDDLEWARE_REWRITES: 'x-middleware-rewrite',
    },
  };
});

const mockResponse = {
  cookies: {
    set: jest.fn(), // This is the 'original' response.set, can be ignored
  },
  headers: new Headers(), // Use a real Headers object
} as unknown as NextResponse;

const mockedGetLocaleFromUrl = getLocaleFromUrl as jest.Mock;

function mockRequest(url: string, cookieLocale?: string): NextRequest & { cookies: never } {
  const requestUrl = new URL(url);
  return {
    url: requestUrl.toString(),
    nextUrl: requestUrl,
    cookies: {
      get: jest.fn((name: string) => {
        if (name === i18nConfig.localeCookie && cookieLocale != undefined) {
          return { value: cookieLocale };
        }
        return;
      }),
    },
  } as unknown as NextRequest & { cookies: never };
}

jest.spyOn(NextResponse, 'redirect').mockImplementation((destination: string | URL) => {
  mockRedirect(destination);
  // Return a mock response that has the cookie-setting function
  return {
    cookies: { set: mockCookieSet },
  } as unknown as NextResponse;
});

jest.spyOn(NextResponse, 'rewrite').mockImplementation((destination: string | URL) => {
  mockRewrite(destination);
  // Return a mock response that has the cookie-setting function
  return {
    cookies: { set: mockCookieSet },
  } as unknown as NextResponse;
});

/**
 * Test Suite for i18nProxy.
 *
 * This suite tests the behavior of the i18nProxy proxy in handling internationalization
 * routing based on URL locale prefixes and cookie-stored locales. It mocks all external
 * dependencies to isolate the proxy's logic.
 *
 */
describe('i18n-proxy', () => {
  const handler = i18nProxy(mockNext);

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetLocaleFromUrl.mockClear();
    mockCookieSet.mockClear();

    // eslint-disable-next-line unicorn/no-useless-undefined
    mockedGetLocaleFromUrl.mockReturnValue(undefined);
  });

  /**
   * Test Case: Default Locale in URL Redirects to Non-Prefixed URL
   *
   * This test verifies that when the URL contains the default locale prefix,
   * the proxy correctly issues a redirect to the same URL without the locale prefix.
   *
   * Example: If the default locale is 'en' and the URL is '/en/products/123',
   * the proxy should redirect to '/products/123'.
   *
   * The test also ensures that query parameters and hash fragments are preserved in the redirect.
   *
   */
  it('Default Locale in URL Redirects to Non-Prefixed URL', async () => {
    // Setup
    mockedGetLocaleFromUrl.mockReturnValue('en');
    const request = mockRequest('https://example.com/en/products/123?sort=new#info', 'fr');

    // Execute
    await handler(request as NextRequest, {} as NextFetchEvent, mockResponse);

    // assert call redirect to URL without locale prefix
    expect(mockRedirect).toHaveBeenCalledTimes(1);
    expect(mockRedirect).toHaveBeenCalledWith(
      new URL('https://example.com/products/123?sort=new#info'),
    );

    // assert cookie is set to 'en'
    expect(mockCookieSet).toHaveBeenCalledWith(Cookie.LOCALE_COOKIE, 'en', {});
    expect(mockNext).not.toHaveBeenCalled();
    expect(mockRewrite).not.toHaveBeenCalled(); // Make sure it didn't rewrite
  });

  /**
   * Test Case: Non-Default Locale in URL is Rewritten to Prefixed Path
   *
   * This test verifies that when the URL contains a non-default locale prefix,
   * the proxy correctly rewrites the internal path to include that locale prefix.
   *
   * Example: If the URL is '/fr/products/123', the proxy should rewrite the internal path
   * to '/fr/products/123'. If the default locale is not 'fr'. Essentially,
   * the path remains unchanged and no redirect occurs.
   *
   * The cookie should be set to the locale from the URL.
   *
   */
  it('Path With Non-Default Locale is Rewritten to Same Path', async () => {
    // Setup
    mockedGetLocaleFromUrl.mockReturnValue('fr');
    const request = mockRequest('https://example.com/fr/products/123', 'en');

    // Execute
    await handler(request as NextRequest, {} as NextFetchEvent, mockResponse);

    // assert rewrite is called. The new path is /fr/products/123
    expect(mockRewrite).toHaveBeenCalledTimes(1);
    expect(mockRewrite).toHaveBeenCalledWith(
      new URL('https://example.com/fr/products/123'), // localeReplacingRewrite logic keeps the 'fr'
    );

    // assert cookie is set to 'fr'
    expect(mockCookieSet).toHaveBeenCalledWith(i18nConfig.localeCookie, 'fr', {});

    // Should NOT redirect, SHOULD call next
    expect(mockRedirect).not.toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  /**
   * Test Case: Path Without Locale Uses Cookie Locale for Rewrite
   *
   * This test verifies that when the URL does not contain a locale prefix,
   * the proxy correctly uses the locale stored in the cookie to rewrite
   * the internal path.
   *
   * Example: If the URL is '/products/123' and the cookie locale is 'de',
   * the proxy should rewrite the internal path to '/de/products/123'.
   * Even if the default locale is not 'de'.
   *
   * The cookie should not be changed in this case (it remains as 'de').
   *
   */
  it('Path Without Locale Uses Cookie Locale for Rewrite', async () => {
    // Setup
    const request = mockRequest('https://example.com/products/123', 'de');

    // Execute
    await handler(request as NextRequest, {} as NextFetchEvent, mockResponse);

    expect(mockRewrite).toHaveBeenCalledTimes(1);
    expect(mockRewrite).toHaveBeenCalledWith(new URL('https://example.com/de/products/123'));

    // assert cookie is set to 'de'
    expect(mockCookieSet).toHaveBeenCalledWith(i18nConfig.localeCookie, 'de', {});

    // Should NOT redirect, SHOULD call next
    expect(mockRedirect).not.toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  /**
   * Test Case: Path Without Locale and No Cookie Uses Default Locale for Rewrite
   *
   * This test verifies that when the URL does not contain a locale prefix
   * and there is no locale stored in the cookie, the proxy correctly
   * uses the default locale to rewrite the internal path.
   *
   * Example: If the URL is '/products/123' and there is no cookie locale,
   * the proxy should rewrite the internal path to '/en/products/123'
   * assuming 'en' is the default locale.
   *
   * The cookie should be set to the default locale in this case.
   *
   */
  it('Path Without Locale and No Cookie Uses Default Locale for Rewrite', async () => {
    // Setup
    const request = mockRequest('https://example.com/products/123'); // No cookie

    // Execute
    await handler(request as NextRequest, {} as NextFetchEvent, mockResponse);

    // assert rewrite is called with the default locale and prefixed path
    expect(mockRewrite).toHaveBeenCalledTimes(1);
    expect(mockRewrite).toHaveBeenCalledWith(
      new URL('https://example.com/en/products/123'), // Prepends 'en'
    );

    // assert cookie is set to 'en'
    expect(mockCookieSet).toHaveBeenCalledWith(i18nConfig.localeCookie, 'en', {});

    // Should NOT redirect, SHOULD call next
    expect(mockRedirect).not.toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  /**
   * Test Case: Path With Non-Default Locale and Cookie Ignores Cookie Locale
   *
   * This test verifies that when the URL contains a non-default locale prefix,
   * the proxy correctly ignores the locale stored in the cookie and
   * rewrites the internal path based on the URL locale.
   *
   * Example: If the URL is '/fr/products/123' and the cookie locale is 'de',
   * the proxy should rewrite the internal path to '/fr/products/123'.
   * The cookie should be updated to 'fr'.
   *
   */
  it('Path With Non-Default Locale and Cookie Ignores Cookie Locale', async () => {
    // Setup
    mockedGetLocaleFromUrl.mockReturnValue('fr');
    const request = mockRequest('https://example.com/fr/products/123', 'de');

    // Execute
    await handler(request as NextRequest, {} as NextFetchEvent, mockResponse);

    // assert rewrite is called with the URL locale ('fr')
    expect(mockRewrite).toHaveBeenCalledTimes(1);
    expect(mockRewrite).toHaveBeenCalledWith(
      new URL('https://example.com/fr/products/123'), // Keeps 'fr'
    );

    // assert cookie is set to 'fr' (updated from 'de')
    expect(mockCookieSet).toHaveBeenCalledWith(i18nConfig.localeCookie, 'fr', {});

    // Should NOT redirect, SHOULD call next
    expect(mockRedirect).not.toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  /**
   * Test Case: Path With Default Locale and Cookie Ignores Cookie Locale
   *
   * This test verifies that when the URL contains the default locale prefix,
   * the proxy correctly issues a redirect to the same URL without the locale prefix,
   * ignoring any locale stored in the cookie.
   *
   * Example: If the default locale is 'en', the URL is '/en/products/123',
   * and the cookie locale is 'fr', the proxy should redirect to '/products/123'.
   * The cookie should be updated to 'en'.
   */
  it('Path With Default Locale and Cookie Ignores Cookie Locale', async () => {
    // Setup
    mockedGetLocaleFromUrl.mockReturnValue('en');
    const request = mockRequest('https://example.com/en/products/123', 'fr');

    // Execute
    await handler(request as NextRequest, {} as NextFetchEvent, mockResponse);

    // assert call redirect to URL without locale prefix
    expect(mockRedirect).toHaveBeenCalledTimes(1);
    expect(mockRedirect).toHaveBeenCalledWith(new URL('https://example.com/products/123'));

    // assert cookie is set to 'en' (updated from 'fr')
    expect(mockCookieSet).toHaveBeenCalledWith(i18nConfig.localeCookie, 'en', {});

    // Should NOT call next or rewrite
    expect(mockNext).not.toHaveBeenCalled();
    expect(mockRewrite).not.toHaveBeenCalled();
  });

  /**
   * Test Case: Path Without Locale and Invalid Cookie Uses Default Locale for Rewrite
   *
   * This test verifies that when the URL does not contain a locale prefix
   * and the cookie contains an invalid locale, the proxy correctly
   * uses the default locale to rewrite the internal path.
   *
   * Example: If the URL is '/products/123' and the cookie locale is 'es'
   * (which is not in the supported locales), the proxy should rewrite
   * the internal path to '/en/products/123' assuming 'en' is the default locale.
   *
   */
  it('Path Without Locale and Invalid Cookie Uses Default Locale for Rewrite', async () => {
    // Setup
    const request = mockRequest('https://example.com/products/123', 'es');

    // Execute
    await handler(request as NextRequest, {} as NextFetchEvent, mockResponse);

    // assert rewrite is called with the invalid cookie locale ('es')
    expect(mockRewrite).toHaveBeenCalledTimes(1);
    expect(mockRewrite).toHaveBeenCalledWith(
      new URL('https://example.com/es/products/123'), // Prepends 'es'
    );

    // assert cookie is set to 'es' (the invalid cookie)
    expect(mockCookieSet).toHaveBeenCalledWith(i18nConfig.localeCookie, 'es', {});

    // Should NOT redirect, SHOULD call next
    expect(mockRedirect).not.toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  /**
   * Test Case: Path With Invalid Locale Are Treated as Path Without Locale
   *
   * This test verifies that when the URL contains an invalid locale prefix,
   * the proxy treats it as if there is no locale prefix and uses the cookie
   * locale (if valid) or default locale for the rewrite.
   *
   * Example: If the URL is '/es/products/123' (where 'es' is invalid) and the cookie locale is 'fr',
   * the proxy should rewrite the internal path to '/fr/es/products/123'.
   *
   */
  it('Path With Invalid Locale Are Treated as Path Without Locale', async () => {
    // Setup
    const request = mockRequest('https://example.com/es/products/123', 'fr');

    // Execute
    await handler(request as NextRequest, {} as NextFetchEvent, mockResponse);

    // assert rewrite is called with the cookie locale ('fr') and original path prefixed
    expect(mockRewrite).toHaveBeenCalledTimes(1);
    expect(mockRewrite).toHaveBeenCalledWith(new URL('https://example.com/fr/es/products/123'));

    // assert cookie is set to 'fr'
    expect(mockCookieSet).toHaveBeenCalledWith(i18nConfig.localeCookie, 'fr', {});

    // Should NOT redirect, SHOULD call next
    expect(mockRedirect).not.toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  /**
   * Test Case: Path With Invalid Locale and Invalid Cookie Uses Default Locale for Rewrite
   *
   * This test verifies that when the URL contains an invalid locale prefix
   * and the cookie also contains an invalid locale, the proxy correctly
   * uses the default locale to rewrite the internal path.
   *
   * Example: If the URL is '/es/products/123' (where 'es' is invalid) and the cookie locale is 'it'
   * (also invalid), the proxy should rewrite the internal path to '/en/es/products/123' assuming
   * 'en' is the default locale.
   *
   */
  it('Path With Invalid Locale and Invalid Cookie Uses Default Locale for Rewrite', async () => {
    // Setup
    const request = mockRequest('https://example.com/es/products/123', 'it'); // 'it' is invalid

    // Execute
    await handler(request as NextRequest, {} as NextFetchEvent, mockResponse);

    // assert rewrite is called with the invalid cookie locale ('it') and original path prefixed
    expect(mockRewrite).toHaveBeenCalledTimes(1);
    expect(mockRewrite).toHaveBeenCalledWith(new URL('https://example.com/it/es/products/123'));

    // assert cookie is set to 'it'
    expect(mockCookieSet).toHaveBeenCalledWith(i18nConfig.localeCookie, 'it', {});

    // Should NOT redirect, SHOULD call next
    expect(mockRedirect).not.toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalledTimes(1);
  });
});
