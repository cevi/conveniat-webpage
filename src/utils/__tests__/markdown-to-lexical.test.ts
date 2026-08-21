import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';

import { convertLexicalToMarkdown, convertMarkdownToLexical } from '@/utils/markdown-to-lexical';

/**
 * Builds a minimal Lexical editor state around the given root children.
 * Mirrors the shape Payload returns for a `richText` field.
 */
const editorStateOf = (children: unknown[]): SerializedEditorState =>
  ({
    root: {
      type: 'root',
      version: 1,
      children,
      direction: 'ltr',
      format: '',
      indent: 0,
    },
  }) as unknown as SerializedEditorState;

const paragraphOf = (...textNodes: { text: string; format: number }[]): unknown => ({
  type: 'paragraph',
  version: 1,
  children: textNodes.map(({ text, format }) => ({
    type: 'text',
    version: 1,
    text,
    format,
    detail: 0,
    mode: 'normal',
    style: '',
  })),
  direction: 'ltr',
  format: '',
  indent: 0,
  textFormat: 0,
  textStyle: '',
});

describe('convertLexicalToMarkdown', () => {
  // Regression: `target_group` on `camp-schedule-entry` is an optional, localized
  // richText field and the config sets `localization.fallback: false`, so Payload
  // returns `undefined` whenever an organiser left it empty. Dereferencing `.root`
  // threw `Cannot read properties of undefined (reading 'root')`, which failed the
  // whole `schedule.getCourseStatus` query and silently stripped the admin UI
  // (edit button, participant list, group-chat link) from the course detail page.
  it.each([
    ['undefined', undefined],
    // eslint-disable-next-line unicorn/no-null
    ['null', null],
  ])('returns an empty string for an unset editor state (%s)', (_label, editorState) => {
    expect(convertLexicalToMarkdown(editorState)).toBe('');
  });

  it('returns an empty string for an editor state without a root', () => {
    expect(convertLexicalToMarkdown({} as unknown as SerializedEditorState)).toBe('');
  });

  it('returns an empty string for an empty document', () => {
    expect(convertLexicalToMarkdown(editorStateOf([]))).toBe('');
  });

  it('converts a plain paragraph', () => {
    expect(
      convertLexicalToMarkdown(editorStateOf([paragraphOf({ text: 'Hello', format: 0 })])),
    ).toBe('Hello');
  });

  it('converts inline formatting', () => {
    const state = editorStateOf([
      paragraphOf(
        { text: 'normal ', format: 0 },
        { text: 'bold', format: 1 },
        { text: ' ', format: 0 },
        { text: 'italic', format: 2 },
        { text: ' ', format: 0 },
        { text: 'both', format: 3 },
      ),
    ]);

    expect(convertLexicalToMarkdown(state)).toBe('normal **bold** *italic* ***both***');
  });

  it('separates paragraphs with a blank line', () => {
    const state = editorStateOf([
      paragraphOf({ text: 'First', format: 0 }),
      paragraphOf({ text: 'Second', format: 0 }),
    ]);

    expect(convertLexicalToMarkdown(state)).toBe('First\n\nSecond');
  });

  it('converts bullet lists', () => {
    const state = editorStateOf([
      {
        type: 'list',
        version: 1,
        listType: 'bullet',
        start: 1,
        tag: 'ul',
        children: [
          {
            type: 'listitem',
            version: 1,
            children: [paragraphOf({ text: 'one', format: 0 })],
            direction: 'ltr',
            format: '',
            indent: 0,
            value: 1,
          },
          {
            type: 'listitem',
            version: 1,
            children: [paragraphOf({ text: 'two', format: 0 })],
            direction: 'ltr',
            format: '',
            indent: 0,
            value: 2,
          },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
      },
    ]);

    expect(convertLexicalToMarkdown(state)).toBe('- one\n- two');
  });

  it('tolerates a list item with no paragraph child', () => {
    const state = editorStateOf([
      {
        type: 'list',
        version: 1,
        listType: 'bullet',
        start: 1,
        tag: 'ul',
        children: [
          {
            type: 'listitem',
            version: 1,
            children: [],
            direction: 'ltr',
            format: '',
            indent: 0,
            value: 1,
          },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
      },
    ]);

    expect(convertLexicalToMarkdown(state)).toBe('- ');
  });
});

describe('convertMarkdownToLexical', () => {
  it('round-trips paragraphs and inline formatting', () => {
    const markdown = 'A **bold** word\n\nAnd *italic* text';

    expect(convertLexicalToMarkdown(convertMarkdownToLexical(markdown))).toBe(markdown);
  });

  it('round-trips bullet lists', () => {
    const markdown = '- one\n- two';

    expect(convertLexicalToMarkdown(convertMarkdownToLexical(markdown))).toBe(markdown);
  });

  it('produces an empty document for an empty string', () => {
    expect(convertLexicalToMarkdown(convertMarkdownToLexical(''))).toBe('');
  });
});
