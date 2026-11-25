import {
  lexicalPlainText,
  replaceUniqueInLexical,
  replaceUniqueInText,
} from '@/features/payload-cms/payload-cms/utils/proofread';

const text = (value: string, format = 0): Record<string, unknown> => ({
  type: 'text',
  text: value,
  format,
});

const paragraph = (...children: unknown[]): Record<string, unknown> => ({
  type: 'paragraph',
  children,
});

const editorState = (...children: unknown[]): { root: Record<string, unknown> } => ({
  root: { type: 'root', children },
});

describe('lexicalPlainText', () => {
  it('puts each paragraph and list item on its own line, links included', () => {
    const state = editorState(
      paragraph(text('Bitte über die '), {
        type: 'link',
        children: [text('Cevi.DB')],
      }),
      paragraph(text(' anmelden.')),
      {
        type: 'list',
        children: [
          { type: 'listitem', children: [text('Züri 11')] },
          { type: 'listitem', children: [text('Cevi Uster')] },
        ],
      },
    );

    expect(lexicalPlainText(state)).toBe('Bitte über die Cevi.DB\n anmelden.\nZüri 11\nCevi Uster');
  });

  it('reads nothing from a value that is no editor state', () => {
    expect(lexicalPlainText(null)).toBe('');
    expect(lexicalPlainText({ root: 'broken' })).toBe('');
    expect(lexicalPlainText(editorState({ type: 'upload', value: 1 }))).toBe('');
  });
});

describe('replaceUniqueInText', () => {
  it('replaces a place that occurs once', () => {
    expect(replaceUniqueInText('Das Aufbaulger Höfe', 'Aufbaulger', 'Aufbaulager')).toBe(
      'Das Aufbaulager Höfe',
    );
  });

  it('refuses a place that occurs twice or not at all', () => {
    expect(replaceUniqueInText('der Hof und der Hof', 'Hof', 'Höfe')).toBeUndefined();
    expect(replaceUniqueInText('der Hof', 'Quartier', 'Quartiere')).toBeUndefined();
  });

  it('inserts a suggestion with a dollar sign literally', () => {
    expect(replaceUniqueInText('kostet 5 CHF', '5 CHF', 'CHF $&5')).toBe('kostet CHF $&5');
  });
});

describe('replaceUniqueInLexical', () => {
  it('replaces the place inside its text node and keeps the formatting', () => {
    const state = editorState(paragraph(text('über die '), text('CeviDB', 1), text(' anmelden')));

    const next = replaceUniqueInLexical(state, 'CeviDB', 'Cevi.DB');

    expect(next).toEqual(
      editorState(paragraph(text('über die '), text('Cevi.DB', 1), text(' anmelden'))),
    );
    expect(state).toEqual(
      editorState(paragraph(text('über die '), text('CeviDB', 1), text(' anmelden'))),
    );
  });

  it('refuses a place that occurs in two paragraphs', () => {
    const state = editorState(paragraph(text('Jede Abteilung')), paragraph(text('eine Abteilung')));
    expect(replaceUniqueInLexical(state, 'Abteilung', 'Abteilungen')).toBeUndefined();
  });

  it('refuses a place that spans differently formatted text', () => {
    const state = editorState(paragraph(text('Aufbau'), text('lger', 1)));
    expect(replaceUniqueInLexical(state, 'Aufbaulger', 'Aufbaulager')).toBeUndefined();
  });
});
