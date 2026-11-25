import {
  resolveLoginReturnPath,
  returnsToAdminPanel,
} from '@/features/payload-cms/payload-cms/components/login-page/login-return-path';

describe('resolveLoginReturnPath', () => {
  it('returns to the page the failed login started on', () => {
    expect(
      resolveLoginReturnPath([undefined, 'https://conveniat27.ch/hof-dashboard?tab=x#y']),
    ).toBe('/hof-dashboard?tab=x#y');
  });

  it('prefers the address over the cookie', () => {
    expect(resolveLoginReturnPath(['/app/dashboard', 'https://conveniat27.ch/stadtleben'])).toBe(
      '/app/dashboard',
    );
  });

  it('has no return page when the login started on the login page', () => {
    expect(
      resolveLoginReturnPath(['https://conveniat27.ch/admin/login?error=Configuration']),
    ).toBeUndefined();
    expect(resolveLoginReturnPath([undefined, ''])).toBeUndefined();
  });

  it('never leaves the site', () => {
    expect(resolveLoginReturnPath(['https://evil.example/hof-dashboard'])).toBe('/hof-dashboard');
    expect(resolveLoginReturnPath(['https://conveniat27.ch//evil.example'])).toBeUndefined();
    // A browser reads `/\host` as another site; here only its path, `/`, survives.
    expect(resolveLoginReturnPath([String.raw`/\evil.example/`])).toBe('/');
  });
});

describe('returnsToAdminPanel', () => {
  it('is the admin panel for a login without a return page and for admin pages', () => {
    expect(returnsToAdminPanel(resolveLoginReturnPath([]))).toBe(true);
    expect(returnsToAdminPanel('/admin')).toBe(true);
    expect(returnsToAdminPanel('/admin/collections/forms')).toBe(true);
  });

  it('is not the admin panel for a page of the site', () => {
    expect(returnsToAdminPanel('/hof-dashboard')).toBe(false);
    expect(returnsToAdminPanel('/administration')).toBe(false);
  });
});
