import { dropUnansweredLines } from '@/features/payload-cms/payload-cms/plugins/form/drop-unanswered-lines';

interface Node {
  type: string;
  text?: string;
  children?: Node[];
}

const text = (value: string): Node => ({ type: 'text', text: value });
const linebreak: Node = { type: 'linebreak' };
const paragraph = (...children: Node[]): Node => ({ type: 'paragraph', children });

/** The message as lines of text, paragraphs separated by `|`. */
const read = (root: Node): string =>
  (root.children ?? [])
    .map((block) =>
      (block.children ?? [])
        .map((node) =>
          node.type === 'linebreak'
            ? '/'
            : (node.text ?? '') + (node.children ?? []).map((c) => c.text ?? '').join(''),
        )
        .join(''),
    )
    .join(' | ');

const unanswered = new Set(['pioniertechnik', 'matchef', 'ceviname']);
const drop = (root: Node): string => {
  dropUnansweredLines(root, (name) => unanswered.has(name));
  return read(root);
};

describe('dropUnansweredLines', () => {
  it('leaves out the lines about questions the person did not answer', () => {
    const root: Node = {
      type: 'root',
      children: [
        paragraph(
          text('Bereich: {{ressortwunsch}}'),
          linebreak,
          text('Pioniertechnik: {{pioniertechnik}}'),
          linebreak,
          text('Mat-Chef: '),
          text('{{matchef}}'),
        ),
      ],
    };

    expect(drop(root)).toBe('Bereich: {{ressortwunsch}}');
  });

  it('removes a paragraph it emptied, and keeps one the editor left empty as spacing', () => {
    const root: Node = {
      type: 'root',
      children: [
        paragraph(text('Hallo {{vorname}}')),
        paragraph(),
        paragraph(linebreak),
        paragraph(text('Pioniertechnik: {{pioniertechnik}}')),
        paragraph(text('Liebe Grüsse')),
      ],
    };

    expect(drop(root)).toBe('Hallo {{vorname}} |  | / | Liebe Grüsse');
  });

  it('keeps a line that also names an answered question or no question of the form', () => {
    const root: Node = {
      type: 'root',
      children: [
        paragraph(text('Name: {{vorname}} v/o {{ceviname}}')),
        paragraph(text('Tippfehler: {{pioniertechnk}}')),
        paragraph(text('Ohne Platzhalter')),
      ],
    };

    expect(drop(root)).toBe(
      'Name: {{vorname}} v/o {{ceviname}} | Tippfehler: {{pioniertechnk}} | Ohne Platzhalter',
    );
  });

  it('removes a list item, and the list once it has none left', () => {
    const root: Node = {
      type: 'root',
      children: [
        {
          type: 'list',
          children: [{ type: 'listitem', children: [text('Mat-Chef: {{matchef}}')] }],
        },
        paragraph(text('Danke')),
      ],
    };

    expect(drop(root)).toBe('Danke');
  });
});
