import { splitPdfText } from '@/features/payload-cms/search/pdf-text';

describe('splitPdfText', () => {
  it('returns one entry per page, without the empty text after the last form feed', () => {
    expect(splitPdfText('Quartier\neinteilung\f\fSeite drei\f')).toEqual([
      'Quartier einteilung',
      '',
      'Seite drei',
    ]);
  });

  it('collapses the line breaks and spaces of the PDF layout', () => {
    expect(splitPdfText('  Cevi   Uster\n\n  Züri 11  \f')).toEqual(['Cevi Uster Züri 11']);
  });

  it('reads a PDF without any text as one empty page', () => {
    expect(splitPdfText('')).toEqual(['']);
  });
});
