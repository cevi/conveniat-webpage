import { isRoutableURL } from '@/utils/is-routable-url';

describe('isRoutableURL', () => {
  describe('hrefs the URL parser rejects', () => {
    // Each of these is what an editor leaves behind mid-typing, and each would
    // otherwise be rendered as a link a visitor can click and get nowhere.
    // See https://github.com/cevi/conveniat-webpage/issues/1670
    it.each([
      ['a bare https scheme, as typed into a draft', 'https://'],
      ['a bare http scheme', 'http://'],
      ['a scheme with an empty host', 'https:///'],
      ['a protocol-relative href with no host', '//'],
      ['a scheme followed by whitespace', 'https:// '],
      ['a scheme followed by an encoded space', 'https://%20'],
    ])('rejects %s', (_description, href) => {
      expect(isRoutableURL(href)).toBe(false);
    });
  });

  describe('hrefs that are not a destination', () => {
    it.each([
      ['an empty string', ''],
      ['whitespace only', '   '],
    ])('rejects %s', (_description, href) => {
      // These resolve against the base rather than failing, so the parser alone
      // would wave them through.
      expect(isRoutableURL(href)).toBe(false);
    });
  });

  describe('hrefs the router can use', () => {
    it.each([
      ['an absolute URL', 'https://donate.raisenow.io/cprdt'],
      ['a bare host', 'https://conveniat27.ch'],
      ['a root-relative path', '/mitmachen-abteilungen'],
      ['a path with a query string', '/app/schedule?id=abc'],
      ['a path with a fragment', '/ueber-uns#projektleitung'],
      ['a mailto link', 'mailto:info@conveniat27.ch'],
      ['a tel link', 'tel:+41441234567'],
    ])('accepts %s', (_description, href) => {
      expect(isRoutableURL(href)).toBe(true);
    });
  });
});
