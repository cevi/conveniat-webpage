import { CEVI_DATABASE_USER_AGENT, withCeviDatabaseUserAgent } from '@/lib/hitobito/user-agent';

describe('withCeviDatabaseUserAgent', () => {
  it('identifies the request as the conveniat27 ERP', () => {
    const headers = new Headers(withCeviDatabaseUserAgent().headers);

    expect(headers.get('User-Agent')).toBe(CEVI_DATABASE_USER_AGENT);
    expect(CEVI_DATABASE_USER_AGENT).toContain('conveniat27-ERP');
  });

  it('replaces the name a library put on the request and keeps everything else', () => {
    const init = withCeviDatabaseUserAgent({
      method: 'POST',
      headers: { 'user-agent': 'oauth4webapi/v3', Authorization: 'Bearer abc' },
    });
    const headers = new Headers(init.headers);

    expect(headers.get('User-Agent')).toBe(CEVI_DATABASE_USER_AGENT);
    expect(headers.get('Authorization')).toBe('Bearer abc');
    expect(init.method).toBe('POST');
  });
});
