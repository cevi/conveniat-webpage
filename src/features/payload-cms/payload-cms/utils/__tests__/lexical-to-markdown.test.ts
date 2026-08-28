import type { LexicalNode } from '@/features/payload-cms/payload-cms/utils/lexical-to-markdown';
import { getLexicalText } from '@/features/payload-cms/payload-cms/utils/lexical-to-markdown';

const text = (value: string, format = 0): LexicalNode => ({ type: 'text', text: value, format });
const paragraph = (...children: LexicalNode[]): LexicalNode => ({ type: 'paragraph', children });
const lineBreak: LexicalNode = { type: 'linebreak' };
const document_ = (...children: LexicalNode[]): { root: LexicalNode } => ({
  root: { type: 'root', children },
});

describe('getLexicalText', () => {
  it('keeps a soft line break inside a paragraph', () => {
    const richText = document_(paragraph(text('Zeile 1'), lineBreak, text('Zeile 2')));

    expect(getLexicalText(richText)).toBe('Zeile 1\nZeile 2');
  });

  it('keeps every soft line break of a pasted text block', () => {
    const richText = document_(
      paragraph(text('Zeile 1'), lineBreak, text('Zeile 2'), lineBreak, text('Zeile 3')),
    );

    expect(getLexicalText(richText)).toBe('Zeile 1\nZeile 2\nZeile 3');
  });

  it('keeps a soft line break next to inline formatting', () => {
    const richText = document_(paragraph(text('Wichtig', 1), lineBreak, text('Details')));

    expect(getLexicalText(richText)).toBe('*Wichtig*\nDetails');
  });

  it('separates consecutive paragraphs with a line break', () => {
    const richText = document_(paragraph(text('Absatz 1')), paragraph(text('Absatz 2')));

    expect(getLexicalText(richText)).toBe('Absatz 1\nAbsatz 2');
  });

  it('keeps an empty paragraph as a blank line', () => {
    const richText = document_(paragraph(text('Oben')), paragraph(), paragraph(text('Unten')));

    expect(getLexicalText(richText)).toBe('Oben\n\nUnten');
  });

  it('trims the trailing line break of the last paragraph', () => {
    const richText = document_(paragraph(text('Nur ein Absatz')));

    expect(getLexicalText(richText)).toBe('Nur ein Absatz');
  });

  it('serializes list items as markdown bullets', () => {
    const richText = document_(paragraph(text('Mitbringen:')), {
      type: 'list',
      children: [
        { type: 'listitem', children: [text('Schlafsack')] },
        { type: 'listitem', children: [text('Taschenlampe')] },
      ],
    });

    expect(getLexicalText(richText)).toBe('Mitbringen:\n- Schlafsack\n- Taschenlampe');
  });

  it('serializes links as markdown links', () => {
    const richText = document_(
      paragraph({
        type: 'link',
        fields: { url: 'https://conveniat27.ch' },
        children: [text('Programm')],
      } as unknown as LexicalNode),
    );

    expect(getLexicalText(richText)).toBe('[Programm](https://conveniat27.ch)');
  });

  it('returns an empty string for missing content', () => {
    const missing: unknown = undefined;
    // eslint-disable-next-line unicorn/no-null
    const empty: unknown = null;

    expect(getLexicalText(missing)).toBe('');
    expect(getLexicalText(empty)).toBe('');
    expect(getLexicalText('')).toBe('');
  });
});
