import { stripMarkdownFormatting } from '@/utils/strip-markdown-formatting';

describe('stripMarkdownFormatting', () => {
  it('removes the emphasis markers of the chat dialect', () => {
    expect(stripMarkdownFormatting('*bold*')).toBe('bold');
    expect(stripMarkdownFormatting('_italic_')).toBe('italic');
    expect(stripMarkdownFormatting('~struck~')).toBe('struck');
  });

  it('unwraps nested markers, as emitted for bold italic text', () => {
    expect(stripMarkdownFormatting('_*bold italic*_')).toBe('bold italic');
  });

  it('keeps a markdown link readable by its label', () => {
    expect(stripMarkdownFormatting('See [the programme](https://conveniat27.ch/programm)')).toBe(
      'See the programme',
    );
  });

  it('leaves a bare URL untouched, markers inside it included', () => {
    const url = 'https://conveniat27.ch/a_b_c/d*e*f';
    expect(stripMarkdownFormatting(url)).toBe(url);
  });

  it('leaves text alone that the chat renders literally too', () => {
    // A lone marker, and a `*` that is arithmetic rather than formatting: the chat
    // bubble shows both verbatim, so the notification has to as well.
    expect(stripMarkdownFormatting('4 * 5 = 20')).toBe('4 * 5 = 20');
    expect(stripMarkdownFormatting('one * marker')).toBe('one * marker');
    expect(stripMarkdownFormatting('plain text')).toBe('plain text');
  });

  it('strips the announcement shape the publish hook produces', () => {
    // `*title*\n\nbody`, straight out of `publishAnnouncementToPostgres`.
    expect(stripMarkdownFormatting('*Znacht verschoben*\n\nWir essen um _19:30_.')).toBe(
      'Znacht verschoben\n\nWir essen um 19:30.',
    );
  });

  it('does not reach across line boundaries', () => {
    expect(stripMarkdownFormatting('4 * 5\n6 * 7')).toBe('4 * 5\n6 * 7');
  });

  it('is idempotent', () => {
    const once = stripMarkdownFormatting('*Titel*\n\n_kursiv_ und [Link](https://example.org)');
    expect(stripMarkdownFormatting(once)).toBe(once);
  });
});
