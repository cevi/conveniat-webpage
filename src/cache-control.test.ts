import { cachingHeaders } from '@/cache-control';

describe('cachingHeaders', () => {
  it('includes Content-Type header for /.well-known/apple-app-site-association', () => {
    const headers = cachingHeaders();
    const appleHeader = headers.find((h) => h.source === '/.well-known/apple-app-site-association');
    expect(appleHeader).toBeDefined();
    expect(appleHeader?.headers).toContainEqual({
      key: 'Content-Type',
      value: 'application/json',
    });
  });
});
