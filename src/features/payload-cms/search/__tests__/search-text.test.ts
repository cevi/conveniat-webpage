import {
  buildSnippet,
  containsAllWords,
  parseSearchWords,
  splitHighlights,
} from '@/features/payload-cms/search/search-text';

describe('parseSearchWords', () => {
  it('lower cases the words and drops repeats and extra spaces', () => {
    expect(parseSearchWords('  Quartier  quartier Uster ')).toEqual(['quartier', 'uster']);
  });

  it('keeps at most six words', () => {
    expect(parseSearchWords('a b c d e f g h')).toHaveLength(6);
  });
});

describe('containsAllWords', () => {
  it('ignores case', () => {
    expect(containsAllWords('Die Quartiereinteilung ist da', ['quartier', 'da'])).toBe(true);
    expect(containsAllWords('Die Quartiereinteilung', ['quartier', 'uster'])).toBe(false);
  });
});

describe('buildSnippet', () => {
  const text =
    'Das Gesamtlager hat acht Quartiere. Jeder Hof kennt nach der Anmeldung seine Quartiereinteilung, ' +
    'die das Kernteam im Oktober verschickt. Fragen beantwortet die AVP des Hofs.';

  it('cuts a passage around the first match and marks the cuts', () => {
    const snippet = buildSnippet(text, ['quartiereinteilung'], 30);
    expect(snippet).toContain('Quartiereinteilung');
    expect(snippet.startsWith('…')).toBe(true);
    expect(snippet.endsWith('…')).toBe(true);
  });

  it('starts at the beginning when no word matches', () => {
    expect(buildSnippet(text, ['zelt'], 20).startsWith('Das Gesamtlager')).toBe(true);
  });

  it('returns a short text whole', () => {
    expect(buildSnippet('Züri 11', ['züri'])).toBe('Züri 11');
  });
});

describe('splitHighlights', () => {
  it('marks every occurrence of the words, keeping their case', () => {
    expect(splitHighlights('Die Quartiere und das Quartier', ['quartier'])).toEqual([
      { text: 'Die ', isMatch: false },
      { text: 'Quartier', isMatch: true },
      { text: 'e und das ', isMatch: false },
      { text: 'Quartier', isMatch: true },
    ]);
  });

  it('treats the characters of a regular expression as text', () => {
    expect(splitHighlights('Kosten (CHF)', ['(chf)'])).toEqual([
      { text: 'Kosten ', isMatch: false },
      { text: '(CHF)', isMatch: true },
    ]);
  });
});
