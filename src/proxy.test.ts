import { proxy } from '@/proxy';
import type { Proxy, ProxyResponse } from '@/proxy/types';
import { rotateSessionToken } from '@/proxy/utils/rotate-session-token';
import type { NextFetchEvent, NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

jest.mock('@/proxy/utils/rotate-session-token', () => ({
  rotateSessionToken: jest.fn().mockResolvedValue(void 0),
}));

jest.mock('@/proxy/i18n-proxy', () => ({
  i18nProxy:
    (next: Proxy): Proxy =>
    (
      request: NextRequest,
      event_: NextFetchEvent,
      response: NextResponse,
    ): Promise<ProxyResponse> | ProxyResponse =>
      next(request, event_, response),
}));

jest.mock('@/proxy/design-rewrite-proxy', () => ({
  designRewriteProxy:
    (next: Proxy): Proxy =>
    (
      request: NextRequest,
      event_: NextFetchEvent,
      response: NextResponse,
    ): Promise<ProxyResponse> | ProxyResponse =>
      next(request, event_, response),
}));

describe('proxy - authSessionProxy', () => {
  const mockFetchEvent = {} as NextFetchEvent;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('skips session token rotation for /.well-known/ routes', async () => {
    const request = {
      nextUrl: new URL('https://konekta.ch/.well-known/apple-app-site-association'),
      headers: new Headers(),
      cookies: {
        set: jest.fn(),
      },
    } as unknown as NextRequest;

    const response = NextResponse.next();
    await proxy(request, mockFetchEvent, response);

    expect(rotateSessionToken).not.toHaveBeenCalled();
  });

  it('runs session token rotation for normal routes', async () => {
    const request = {
      nextUrl: new URL('https://konekta.ch/de/app/dashboard'),
      headers: new Headers(),
      cookies: {
        set: jest.fn(),
      },
    } as unknown as NextRequest;

    const response = NextResponse.next();
    await proxy(request, mockFetchEvent, response);

    expect(rotateSessionToken).toHaveBeenCalledWith(request, mockFetchEvent, expect.anything());
  });
});
