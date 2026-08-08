import { cachingHeaders } from '@/cache-control';

describe('cachingHeaders', () => {
  it('includes Content-Type header for /.well-known/apple-app-site-association and /apple-app-site-association', () => {
    const headers = cachingHeaders();
    const wellKnownHeader = headers.find(
      (h) => h.source === '/.well-known/apple-app-site-association',
    );
    expect(wellKnownHeader).toBeDefined();
    expect(wellKnownHeader?.headers).toContainEqual({
      key: 'Content-Type',
      value: 'application/json',
    });

    const rootAppleHeader = headers.find((h) => h.source === '/apple-app-site-association');
    expect(rootAppleHeader).toBeDefined();
    expect(rootAppleHeader?.headers).toContainEqual({
      key: 'Content-Type',
      value: 'application/json',
    });
  });
});
