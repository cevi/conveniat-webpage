jest.mock('@/config/environment-variables', () => ({ environmentVariables: {} }));

import { validateEmailFrom } from '@/features/payload-cms/payload-cms/plugins/form/validate-email-from';

type Options = Parameters<ReturnType<typeof validateEmailFrom>>[1];

const check = (value: string | null | undefined, language = 'de'): string | true =>
  validateEmailFrom('cevi.tools')(value, { req: { i18n: { language } } } as unknown as Options) as
    string | true;

describe('validateEmailFrom', () => {
  it('lets an empty sender fall back to the default one', () => {
    expect(check(null)).toBe(true);
    expect(check('')).toBe(true);
    expect(check('   ')).toBe(true);
  });

  it('accepts a sender of the signed domain, with or without a name', () => {
    expect(check('"conveniat27" <noreply@cevi.tools>')).toBe(true);
    expect(check('noreply@Cevi.Tools')).toBe(true);
  });

  it('refuses a sender of another domain, in the language of the admin panel', () => {
    expect(check('"Besuchstag" <besuchstag@conveniat27.ch>')).toBe(
      'Der Absender muss auf @cevi.tools enden, sonst landen die Mails im Spam.',
    );
    expect(check('besuchstag@conveniat27.ch', 'fr')).toContain('@cevi.tools');
    // a domain that only ends like the signed one is another domain
    expect(check('noreply@notcevi.tools')).not.toBe(true);
  });

  it('refuses a sender whose angle brackets are not closed', () => {
    expect(check('"Besuchstag" <besuchstag@cevi.tools')).toContain('Ungültiger Absender');
  });
});
