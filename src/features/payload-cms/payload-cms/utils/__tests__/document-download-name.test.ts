import {
  buildDocumentContentDisposition,
  withLocaleParameter,
} from '@/features/payload-cms/payload-cms/utils/document-download-name';

describe('buildDocumentContentDisposition', () => {
  it('keeps the file inline and names it after the display name', () => {
    expect(buildDocumentContentDisposition('Packliste', 'a1b2c3.pdf')).toBe(
      `inline; filename="Packliste.pdf"; filename*=UTF-8''Packliste.pdf`,
    );
  });

  it('does not repeat an extension the display name already has', () => {
    expect(buildDocumentContentDisposition('Packliste.PDF', 'a1b2c3.pdf')).toBe(
      `inline; filename="Packliste.PDF"; filename*=UTF-8''Packliste.PDF`,
    );
  });

  it('encodes umlauts and gives older clients an ASCII fallback', () => {
    expect(buildDocumentContentDisposition("Übersicht (Lager) l'été", 'x.pdf')).toBe(
      `inline; filename="Ubersicht (Lager) l'ete.pdf"; ` +
        `filename*=UTF-8''%C3%9Cbersicht%20%28Lager%29%20l%27%C3%A9t%C3%A9.pdf`,
    );
  });

  it('removes characters that would break the header or the file name', () => {
    expect(buildDocumentContentDisposition('a"b\\c\r\nd/e', 'x.pdf')).toBe(
      `inline; filename="abcd-e.pdf"; filename*=UTF-8''abcd-e.pdf`,
    );
  });

  it('does not let fullwidth quotes turn into ASCII ones in the quoted file name', () => {
    expect(buildDocumentContentDisposition('Test\uFF02; attachment; x=\uFF02', 'x.pdf')).toBe(
      `inline; filename="Test; attachment; x=.pdf"; ` +
        `filename*=UTF-8''Test%EF%BC%82%3B%20attachment%3B%20x%3D%EF%BC%82.pdf`,
    );
  });

  it('returns undefined without a usable display name', () => {
    expect(buildDocumentContentDisposition(undefined, 'x.pdf')).toBeUndefined();
    expect(buildDocumentContentDisposition('  "  ', 'x.pdf')).toBeUndefined();
  });

  it('works for files without an extension', () => {
    expect(buildDocumentContentDisposition('Notes', 'README')).toBe(
      `inline; filename="Notes"; filename*=UTF-8''Notes`,
    );
  });
});

describe('withLocaleParameter', () => {
  it('adds the locale as the first or an additional search parameter', () => {
    expect(withLocaleParameter('/api/documents/file/a.pdf', 'fr')).toBe(
      '/api/documents/file/a.pdf?locale=fr',
    );
    expect(withLocaleParameter('/api/documents/file/a.pdf?prefix=x', 'en')).toBe(
      '/api/documents/file/a.pdf?prefix=x&locale=en',
    );
  });
});
