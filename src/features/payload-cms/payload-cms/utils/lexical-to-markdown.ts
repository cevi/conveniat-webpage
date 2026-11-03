export interface LexicalNode {
  type: string;
  text?: string;
  format?: number;
  children?: LexicalNode[];
}

export interface LexicalRichText {
  root?: LexicalNode;
}

/** The nodes that stand on their own lines, separated by a blank line. */
const BLOCK_TYPES = new Set(['paragraph', 'list', 'heading', 'quote']);

/**
 * Serializes a lexical rich text tree into the lightweight markdown dialect the
 * chat renders (see `format-message-content.tsx`).
 *
 * Both ways of breaking a line in the editor have to survive this conversion, and
 * stay apart: a new paragraph (enter) leaves a blank line, as it does in the editor,
 * a soft break (shift+enter, and every newline of a pasted text block) only starts
 * a new line. The chat cannot tell the two apart once both are a newline.
 */
export const serializeLexicalToMarkdown = (node: LexicalNode | null | undefined): string => {
  if (node === undefined || node === null) return '';
  if (node.type === 'text') {
    let text = node.text ?? '';
    if (node.format !== undefined && (node.format & 1) !== 0) text = `*${text}*`; // Bold
    if (node.format !== undefined && (node.format & 2) !== 0) text = `_${text}_`; // Italic
    return text;
  }
  // A soft line break carries no children and no text, so it has to be handled
  // before the generic branches below, which would silently drop it.
  if (node.type === 'linebreak') return '\n';
  if (node.type === 'link' || node.type === 'autolink') {
    const nodeObject = node as unknown as Record<string, unknown>;
    const fields = (nodeObject['fields'] ?? {}) as Record<string, unknown>;
    const url = (fields['url'] ?? nodeObject['url'] ?? '') as string;
    const childrenText = node.children
      ? node.children.map((child) => serializeLexicalToMarkdown(child)).join('')
      : '';
    if (url !== '') {
      if (childrenText === url) return childrenText;
      return `[${childrenText}](${url})`;
    }
    return childrenText;
  }
  if (node.children !== undefined) {
    const children = node.children;
    if (node.type === 'list') {
      return children.map((child) => serializeLexicalToMarkdown(child)).join('\n');
    }
    if (node.type === 'listitem') {
      // a nested list starts on the line after its item
      const itemText = children
        .map((child) => {
          const childText = serializeLexicalToMarkdown(child);
          return child.type === 'list' ? `\n${childText}` : childText;
        })
        .join('');
      return `- ${itemText}`;
    }
    if (children.some((child) => BLOCK_TYPES.has(child.type))) {
      // An empty paragraph adds no second gap: editors used it for the one the
      // chat did not show between paragraphs.
      return children
        .map((child) => serializeLexicalToMarkdown(child))
        .filter((block) => block.trim() !== '')
        .join('\n\n');
    }
    return children.map((child) => serializeLexicalToMarkdown(child)).join('');
  }
  return '';
};

export const getLexicalText = (richText: unknown): string => {
  if (richText === undefined || richText === null || richText === '') return '';
  if (typeof richText === 'string') return richText;
  const lexicalRichText = richText as LexicalRichText;
  if (lexicalRichText.root !== undefined) {
    return serializeLexicalToMarkdown(lexicalRichText.root).trim();
  }
  return JSON.stringify(richText);
};
