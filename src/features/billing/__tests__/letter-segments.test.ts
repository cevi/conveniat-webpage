import {
  parseLetterSegments,
  resolveSegmentFont,
} from '@/features/billing/services/bill-generator-service';

describe('parseLetterSegments', () => {
  it('links the bare addresses editors write into the letter text', () => {
    const segments = parseLetterSegments(
      'Mit dem Bezahlen des Lagerbeitrag bestätigst du, dass du mit unseren AGBs (con27.ch/agbs), ' +
        'den Datenschutz-Bedingungen (con27.ch/datenschutz) sowie mit den Lagerregeln ' +
        '(con27.ch/lagerregeln) einverstanden bist.',
    );

    expect(segments.filter((segment) => segment.href !== undefined)).toEqual([
      { text: 'con27.ch/agbs', style: 'plain', href: 'https://con27.ch/agbs' },
      { text: 'con27.ch/datenschutz', style: 'plain', href: 'https://con27.ch/datenschutz' },
      { text: 'con27.ch/lagerregeln', style: 'plain', href: 'https://con27.ch/lagerregeln' },
    ]);
    expect(segments.map((segment) => segment.text).join('')).toContain('(con27.ch/agbs),');
  });

  it('keeps a full URL as written', () => {
    const segments = parseLetterSegments('Details: https://conveniat27.ch/de/agbs');

    expect(segments).toEqual([
      { text: 'Details: ', style: 'plain' },
      {
        text: 'https://conveniat27.ch/de/agbs',
        style: 'plain',
        href: 'https://conveniat27.ch/de/agbs',
      },
    ]);
  });

  it('keeps the style of the run the address sits in', () => {
    const segments = parseLetterSegments('Siehe **unsere AGB con27.ch/agbs** dazu');

    expect(segments).toContainEqual({
      text: 'con27.ch/agbs',
      style: 'bold',
      href: 'https://con27.ch/agbs',
    });
  });

  it('drops the punctuation that ends the sentence rather than the address', () => {
    const segments = parseLetterSegments('Die Lagerregeln stehen auf con27.ch/lagerregeln.');

    expect(segments.at(-2)).toEqual({
      text: 'con27.ch/lagerregeln',
      style: 'plain',
      href: 'https://con27.ch/lagerregeln',
    });
    expect(segments.at(-1)?.text).toBe('.');
  });

  it('leaves prose that only looks like an address alone', () => {
    for (const text of [
      'Bitte überweise den Betrag, z.B. per E-Banking.',
      'Schreib an finanzen@conveniat27.ch',
      'Die Version 3.90.1 ist aktuell.',
      'Ein fehlendes Leerzeichen nach dem Punkt.Das bleibt Text.',
    ]) {
      expect(parseLetterSegments(text).every((segment) => segment.href === undefined)).toBe(true);
    }
  });

  it('returns the text unchanged when it holds no address', () => {
    expect(parseLetterSegments('Vielen Dank für deine Anmeldung.')).toEqual([
      { text: 'Vielen Dank für deine Anmeldung.', style: 'plain' },
    ]);
  });
});

describe('resolveSegmentFont', () => {
  it('sets a link in bold', () => {
    expect(
      resolveSegmentFont({ text: 'con27.ch/agbs', style: 'plain', href: 'https://con27.ch/agbs' }),
    ).toBe('Helvetica-Bold');
  });

  it('keeps a link inside italic text italic', () => {
    expect(
      resolveSegmentFont({ text: 'con27.ch/agbs', style: 'italic', href: 'https://con27.ch/agbs' }),
    ).toBe('Helvetica-BoldOblique');
  });

  it('leaves text without a link at the style it was written in', () => {
    expect(resolveSegmentFont({ text: 'Lagerbeitrag', style: 'plain' })).toBe('Helvetica');
    expect(resolveSegmentFont({ text: 'Lagerbeitrag', style: 'bold' })).toBe('Helvetica-Bold');
    expect(resolveSegmentFont({ text: 'Lagerbeitrag', style: 'italic' })).toBe('Helvetica-Oblique');
  });
});
