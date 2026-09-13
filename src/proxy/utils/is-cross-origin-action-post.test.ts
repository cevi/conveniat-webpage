import { isCrossOriginActionPost } from '@/proxy/utils/is-cross-origin-action-post';
import type { NextRequest } from 'next/server';

const requestFor = (config: { method?: string; headers?: Record<string, string> }): NextRequest =>
  ({
    method: config.method ?? 'POST',
    headers: new Headers(config.headers ?? {}),
  }) as unknown as NextRequest;

const action = { 'next-action': '7f3a1c4e9b' };

// In production traefik sets x-forwarded-host to the requested domain, while nginx rewrites
// the host header to the upstream service name.
const behindProxy = { 'x-forwarded-host': 'conveniat27.ch', host: 'payload:3000' };

describe('isCrossOriginActionPost', () => {
  /**
   * A client that keeps its method and headers across the con27.ch -> conveniat27.ch/go/
   * redirect arrives with an origin that can never match the host (#1703).
   */
  it('rejects an action post whose origin is a different host', () => {
    expect(
      isCrossOriginActionPost(
        requestFor({ headers: { ...action, ...behindProxy, origin: 'https://con27.ch' } }),
      ),
    ).toBe(true);
  });

  it('rejects an action post with an opaque origin', () => {
    expect(
      isCrossOriginActionPost(
        requestFor({ headers: { ...action, ...behindProxy, origin: 'null' } }),
      ),
    ).toBe(true);
  });

  it('rejects an action post with an unparsable origin', () => {
    expect(
      isCrossOriginActionPost(
        requestFor({ headers: { ...action, ...behindProxy, origin: 'not an origin' } }),
      ),
    ).toBe(true);
  });

  it('accepts an action post from the forwarded host', () => {
    expect(
      isCrossOriginActionPost(
        requestFor({ headers: { ...action, ...behindProxy, origin: 'https://conveniat27.ch' } }),
      ),
    ).toBe(false);
  });

  it('accepts an action post whose port matches the forwarded host', () => {
    expect(
      isCrossOriginActionPost(
        requestFor({
          headers: { ...action, host: 'localhost:3000', origin: 'http://localhost:3000' },
        }),
      ),
    ).toBe(false);
  });

  it('prefers the first x-forwarded-host value over the host header', () => {
    expect(
      isCrossOriginActionPost(
        requestFor({
          headers: {
            ...action,
            'x-forwarded-host': 'konekta.ch, conveniat27.ch',
            host: 'payload:3000',
            origin: 'https://konekta.ch',
          },
        }),
      ),
    ).toBe(false);
  });

  it('accepts an action post without an origin header, which Next.js lets through', () => {
    expect(isCrossOriginActionPost(requestFor({ headers: { ...action, ...behindProxy } }))).toBe(
      false,
    );
  });

  it('accepts a cross-origin post that is not an action', () => {
    expect(
      isCrossOriginActionPost(
        requestFor({ headers: { ...behindProxy, origin: 'https://con27.ch' } }),
      ),
    ).toBe(false);
  });

  it('accepts a GET carrying an action header', () => {
    expect(
      isCrossOriginActionPost(
        requestFor({
          method: 'GET',
          headers: { ...action, ...behindProxy, origin: 'https://con27.ch' },
        }),
      ),
    ).toBe(false);
  });

  it('accepts a request that carries no host at all', () => {
    expect(
      isCrossOriginActionPost(requestFor({ headers: { ...action, origin: 'https://con27.ch' } })),
    ).toBe(false);
  });
});
